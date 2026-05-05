import { xf, exists, clamp, debounce } from '../functions.js';
import { translate } from '../utils.js';
import { models } from '../models/models.js';

class MoxyGraph extends HTMLElement {
    constructor() {
        super();
        const self = this;

        this.Key = {
            smo2: 'smo2',
            thb: 'thb',
            heartRate: 'heartRate',
            power: 'power',
            cadence: 'cadence',
        };

        // Moxy defined ranges and color codes:
        //
        // SmO2 range: 0 - 100,   step: 0.1, <30% - blue, 30%-70% - green, >70% red
        // THb  range: 0 - 40.00, step: 0.01, 8.0 - 15.0, orange
        //
        // We are going to use just green for SmO2, because we are going to add
        // HeartRate layer and it is going to be red and we don't want those to clash

        // initial state
        this.smo2 = {value: 0, x: 0, min: 0, max: 100};
        this.thb = {value: 0, x: 0, min: 8, max: 15};
        this.heartRate = {value: 0, x: 0, min: 30, max: 200};
        this.power = {value: 0, x: 0, min: 0, max: 500};
        this.cadence = {value: 0, x: 0, min: 0, max: 150};

        this.path = {smo2: [], thb: [], heartRate: [], power: [], cadence: []};
        this.samples = {smo2: [], thb: [], heartRate: [], power: [], cadence: []};
        this.$path = {};
        this.$powerFill = undefined;
        this.powerFill = [];
        this.active = {smo2: false, thb: false, heartRate: false, power: false, cadence: false};
        this.chartArea = {top: 0, bottom: 100, height: 100};
        this.xAxis = {min: 0, max: 100};
        this.yAxis = {min: 0, max: 100};
        this.step = 1;
        this.width = 0;
        this.x = 0;
        this.ftp = models.ftp.state ?? models.ftp.defaultValue();

        // configurations
        this.prop = {
            elapsed: 'watch:elapsed',
            smo2: 'db:smo2',
            thb: 'db:thb',
            heartRate: 'db:heartRate',
            power: 'db:power1s',
            cadence: 'db:cadence',
        };
        this.selectors = {
            svg: '#moxy-svg',
            path: {
                smo2: '#moxy-path-smo2',
                thb: '#moxy-path-thb',
                heartRate: '#moxy-path-hr',
                power: '#moxy-path-power',
                cadence: '#moxy-path-cadence',
            },
            powerFill: '#moxy-power-fill',
        };
        this.color = {
            smo2: '#57C057',
            thb: '#FF663A',
            heartRate: '#FE340B',
            power: '#F8C73A',
            cadence: '#57A6FF',
        };
        this.stroke = {
            all: 1,
        };
        this.handlers = {
            smo2:      (value) => self.activate('smo2', value),
            heartRate: (value) => self.activate('heartRate', value),
            power:     (value) => self.activate('power', value),
            cadence:   (value) => self.activate('cadence', value),
            thb:       (value) => {
                self.activate('thb', value);
                self.adjustYMinMaxFor('thb', value);
            }
        };

        this.postInit();
    }
    postInit() {
        // overwrite in child classes
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$cont = document.querySelector('#graph-power') ?? this;
        this.$svg  = this.querySelector(this.selectors.svg);
        this.$heading = this.$cont.querySelector('.graph--heading');
        this.$powerFill = this.ensurePowerFillLayer();

        this.width = this.calcWidth();
        this.syncChartArea();

        for(let key in this.Key) {
            this.$path[key] = this.querySelector(this.selectors.path[key]);
            this.$path[key].setAttribute('stroke', key === this.Key.power ? 'none' : this.color[key]);
            this.$path[key].style.display = 'none';
            xf.sub(`${this.prop[key]}`, this.handlers[key].bind(this), this.signal);
        }

        xf.sub('db:page', this.onPage.bind(this), this.signal);
        xf.sub('db:ftp', this.onFTP.bind(this), this.signal);
        xf.sub(`${this.prop.elapsed}`, this.onElapsed.bind(this), this.signal);
        window.addEventListener(`resize`, this.onResize.bind(this), this.signal);

        this.resizeObserver = new ResizeObserver(() => {
            this.onResize();
        });
        this.resizeObserver.observe(this.$cont);
        this.resizeObserver.observe(this.$svg);
    }
    disconnectedCallback() {
        this.abortController.abort();
        this.resizeObserver?.disconnect();
    }
    calcWidth() {
        return this.$cont?.getBoundingClientRect()?.width ?? this.width ?? window.innerWidth;
    }
    ensurePowerFillLayer() {
        let layer = this.querySelector(this.selectors.powerFill);

        if(!exists(layer)) {
            layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            layer.setAttribute('id', 'moxy-power-fill');
            layer.setAttribute('class', 'moxy--power-fill');
            layer.style.display = 'none';
        }

        if(exists(this.$svg) && layer.parentElement !== this.$svg) {
            this.$svg.insertBefore(layer, this.$svg.firstElementChild);
        }

        return layer;
    }
    calcHeight() {
        return this.$svg?.getBoundingClientRect()?.height ?? this.yAxis.max;
    }
    calcTopInset() {
        return this.$heading?.getBoundingClientRect()?.height ?? 0;
    }
    syncChartArea() {
        const bottom = this.calcHeight();
        const top = this.calcTopInset();

        this.yAxis.max = bottom;
        this.chartArea = {
            top,
            bottom,
            height: Math.max(bottom - top, 1),
        };
    }
    onResize() {
        // TODO: debounce
        this.width = this.calcWidth();
        this.syncChartArea();

        if(!this.hasDrawableArea()) {
            return;
        }

        for(let key in this.samples) {
            this.trimSamples(key);
            if(!this.active[key] || this.samples[key].length === 0) continue;
            this.renderStep(key);
        }
    }
    onPage(page) {
        if(page !== 'home') {
            return;
        }

        requestAnimationFrame(() => {
            this.onResize();
        });
    }
    onFTP(value) {
        const ftp = Number(value);

        if(!Number.isFinite(ftp) || ftp <= 0) {
            return;
        }

        this.ftp = ftp;

        if(this.active.power && this.samples.power.length > 0) {
            this.renderStep(this.Key.power);
        }
    }
    hasDrawableArea() {
        return this.width > 0 && this.chartArea.height > 1 && this.chartArea.bottom > this.chartArea.top;
    }
    maxSamples() {
        return Math.max(Math.floor(this.width / this.step), 1);
    }
    trimSamples(key) {
        const overflow = this.samples[key].length - this.maxSamples();

        if(overflow > 0) {
            this.samples[key].splice(0, overflow);
        }
    }
    adjustYMinMaxFor(key, value) {
        if(this[key].value === 0) {
            this[key].min = value - 1;
            this[key].max = value + 1;
        }
        // this[key].value = value;
        if(value < this[key].min) {
            this[key].min = value;
        }
        if(value > this[key].max) {
            this[key].max = value;
        }
    }
    activate(key, value) {
        if(!exists(value)) {
            return;
        }

        const nextValue = Number(value);

        if(!Number.isFinite(nextValue)) {
            return;
        }

        this.active[key] = true;
        this[key].value = nextValue;
    }
    onElapsed() {
        this.onResize();

        if(!this.hasDrawableArea()) {
            return;
        }

        // first calculate
        for(let key in this.path) {
            if(!this.active[key]) continue;
            this.calcStep(key);
        }

        // render all
        for(let key in this.path) {
            if(!this.active[key]) continue;
            this.renderStep(key);
        }

        this.syncX();
    }
    // this.smo2 =      {value: 0, x: 0, min:  0, max: 100};
    // this.thb =       {value: 0, x: 0, min:  8, max:  15};
    // this.heartRate = {value: 0, x: 0, min: 30, max: 200};
    // this.power =     {value: 0, x: 0, min:  0, max: 600};
    // this.xAxis =     {min: 0, max: 100};
    // this.yAxis =     {min: 0, max: 100};
    translate(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    translateY(key, value) {
        return this.chartArea.bottom - this.translate(
            clamp(this[key].min, this[key].max, value),
            this[key].min,
            this[key].max,
            0,
            this.chartArea.height
        );
    }
    calcStep(key) {
        const value = this[key].value;

        if(!Number.isFinite(value)) {
            return;
        }

        this.samples[key].push(value);
        this.trimSamples(key);
    }
    syncX() {
        this.x = Math.max(...Object.values(this.samples).map(samples => samples.length), 0);
    }
    renderStep(key) {
        const points = this.samples[key].flatMap((value, index) => {
            return [index * this.step, this.translateY(key, value)];
        });

        this.path[key] = points;
        if(key === this.Key.power) {
            this.renderPowerFill();
            return;
        }

        if(!exists(this.$path[key])) {
            return;
        }

        this.$path[key].style.display = 'block';
        this.$path[key].setAttribute('points', points.join(','));
    }
    powerZoneColor(value) {
        const zone = models.ftp.powerToZone(value, this.ftp).name;

        return models.ftp.zoneToColor(zone);
    }
    powerFillPolygon(value, index) {
        const nextValue = this.samples.power[index + 1] ?? value;
        const x0 = index * this.step;
        const x1 = (index + 1) * this.step;
        const y0 = this.translateY(this.Key.power, value);
        const y1 = this.translateY(this.Key.power, nextValue);

        return {
            points: `${x0},${this.chartArea.bottom} ${x0},${y0} ${x1},${y1} ${x1},${this.chartArea.bottom}`,
            color: this.powerZoneColor(value),
        };
    }
    renderPowerFill() {
        if(exists(this.$path.power)) {
            this.$path.power.style.display = 'none';
            this.$path.power.setAttribute('points', '');
        }

        if(!exists(this.$powerFill)) {
            return;
        }

        this.powerFill = this.samples.power.map((value, index) => {
            return this.powerFillPolygon(value, index);
        });

        this.$powerFill.replaceChildren(
            ...this.powerFill.map((item) => {
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', item.points);
                polygon.setAttribute('fill', item.color);
                return polygon;
            })
        );
        this.$powerFill.style.display = this.powerFill.length > 0 ? 'block' : 'none';
    }
}

customElements.define('moxy-graph', MoxyGraph);

export {
    MoxyGraph,
}
