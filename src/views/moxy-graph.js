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
        this.$path = {};
        this.active = {smo2: false, thb: false, heartRate: false, power: false, cadence: false};
        this.chartArea = {top: 0, bottom: 100, height: 100};
        this.xAxis = {min: 0, max: 100};
        this.yAxis = {min: 0, max: 100};
        this.step = 1;
        this.width = 0;
        this.x = 0;

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

        this.width = this.calcWidth();
    this.syncChartArea();

        for(let key in this.Key) {
            this.$path[key] = this.querySelector(this.selectors.path[key]);
            this.$path[key].setAttribute('stroke', this.color[key]);
            this.$path[key].style.display = 'none';
            xf.sub(`${this.prop[key]}`, this.handlers[key].bind(this), this.signal);
        }

        xf.sub(`${this.prop.elapsed}`, this.onElapsed.bind(this), this.signal);
        window.addEventListener(`resize`, this.onResize.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    calcWidth() {
        return this.$cont.getBoundingClientRect()?.width ?? window.innerWidth;
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

        this.active[key] = true;
        this[key].value = value;
    }
    onElapsed() {
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

        // move x to the right for the next elapsed interval
        this.x += this.step;
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
        const y = this.translateY(key, this[key].value);
        let length = this.path[key].length;

        if((length / 2) >= (this.width / this.step)) {
            const diff = (length / 2) - (this.width / this.step);

            if(diff >= 2) {
                length = this.width * 2;
                // splice window diff from the front and account for the one shift
                this.path[key].splice(0, (diff*2)+2);
                // shift path x values to start from 0
                for(let i = 0, j = 0; i < length; i+=1) {
                    if(i % 2 == 0) {
                        this.path[key][i] = j;
                        j+=1;
                    };
                }
                this.x = (length/2) - 1;
                // shift
                this.path[key][length-2] = this.x;
                this.path[key][length-1] = y;
            } else {
                // when xAxis.max is reached,
                // shift in place 2 positions back
                // and set the last 2 position with the new data
                for(let i = 2; i < length; i+=1) {
                    if(i % 2 !== 0) {
                        this.path[key][i-2] = this.path[key][i];
                    };
                }
                // update x to the new smaller length and
                // compansate for the shift with - 1
                this.x = (length/2) - 1;
                // shift
                this.path[key][length-2] = this.x;
                this.path[key][length-1] = y;
            }
        } else {
            // push until xAxis.max is reached
            this.path[key].push(this.x);
            this.path[key].push(y);
        }
    }
    renderStep(key) {
        this.$path[key].style.display = 'block';
        const points = this.path[key].join(',');
        this.$path[key].setAttribute('points', points);
    }
}

customElements.define('moxy-graph', MoxyGraph);

export {
    MoxyGraph,
}
