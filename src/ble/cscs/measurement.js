import { toFixed } from '../../functions.js';
import { RevsOverTime } from './revs-over-time.js';

const wheelRevolutionDataPresent = (flags) => ((flags >> 0) & 1) === 1;
const crankRevolutionDataPresent = (flags) => ((flags >> 1) & 1) === 1;

const _ = {
    flagsIndex: () => 0,
    cumulativeWheelRevolutionsIndex: (flags) => wheelRevolutionDataPresent(flags) ? 1 : undefined,
    lastWheelEventTimeIndex: (flags) => wheelRevolutionDataPresent(flags) ? 5 : undefined,
    cumulativeCrankRevolutionsIndex: (flags) => {
        if(!crankRevolutionDataPresent(flags)) return undefined;
        return wheelRevolutionDataPresent(flags) ? 7 : 1;
    },
    lastCrankEventTimeIndex: (flags) => {
        if(!crankRevolutionDataPresent(flags)) return undefined;
        return wheelRevolutionDataPresent(flags) ? 9 : 3;
    },
    readFlags: (dataview) => dataview.getUint8(0, true),
    readCumulativeWheelRevolutions: (dataview) => {
        const index = _.cumulativeWheelRevolutionsIndex(_.readFlags(dataview));
        return index === undefined ? undefined : dataview.getUint32(index, true);
    },
    readLastWheelEventTime: (dataview) => {
        const index = _.lastWheelEventTimeIndex(_.readFlags(dataview));
        return index === undefined ? undefined : dataview.getUint16(index, true);
    },
    readCumulativeCrankRevolutions: (dataview) => {
        const index = _.cumulativeCrankRevolutionsIndex(_.readFlags(dataview));
        return index === undefined ? undefined : dataview.getUint16(index, true);
    },
    readLastCrankEventTime: (dataview) => {
        const index = _.lastCrankEventTimeIndex(_.readFlags(dataview));
        return index === undefined ? undefined : dataview.getUint16(index, true);
    },
};

function Cadence() {
    return RevsOverTime({
        resolution: 1024,
        maxRevs: 2**16,
        maxTime: 2**16,
        rate: 512,
        format: (x) => Math.round(x * 60),
    });
}

function Speed(args = {}) {
    const wheelCircumference = args.wheelCircumference ?? 2.105;

    return RevsOverTime({
        resolution: 2048,
        maxRevs: 2**32,
        maxTime: 2**16,
        rate: 1024,
        format: (x) => toFixed(x * wheelCircumference * 3.6, 2),
    });
}

function Measurement() {
    const speed = Speed();
    const cadence = Cadence();

    function reset() {
        return {
            wheel: speed.reset(),
            crank: cadence.reset(),
        };
    }

    function decode(dataview) {
        const wheelRevolutions = _.readCumulativeWheelRevolutions(dataview);
        const wheelEvent = _.readLastWheelEventTime(dataview);
        const crankRevolutions = _.readCumulativeCrankRevolutions(dataview);
        const crankEvent = _.readLastCrankEventTime(dataview);

        return {
            wheelRevolutions,
            wheelEvent,
            speed: speed.calculate(wheelRevolutions, wheelEvent),
            crankRevolutions,
            crankEvent,
            cadence: cadence.calculate(crankRevolutions, crankEvent),
        };
    }

    return {
        speed,
        cadence,
        reset,
        decode,
    };
}

export { Measurement, Speed, Cadence, _ };