import { appData } from './data.js';
import { fit } from '../../src/fit/fit.js';
import { FITjs } from '../../src/fit/fitjs.js';
import { dataviewToArray } from '../../src/functions.js';

describe('FITjs', () => {
    const fitjs = fit.localActivity.toFITjs({
        records: appData.records,
        laps: appData.laps,
    });
    const encoded = FITjs.encode(fitjs);
    const array = dataviewToArray(encoded);

    test('decode', () => {
        const decoded = FITjs.decode(encoded);

        expect(decoded[0]).toMatchObject({type: 'header', dataType: '.FIT'});
        expect(decoded.at(-1)).toMatchObject({type: 'crc'});
        expect(decoded.filter(record => record.name === 'record' && record.type === 'data')).toHaveLength(appData.records.length);
    });

    test('encode', () => {
        expect(dataviewToArray(FITjs.encode(fitjs))).toEqual(array);
    });
});
