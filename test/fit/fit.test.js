// import { describe, expect, test } from 'vitest';

import { dataviewToArray } from '../../src/functions.js';
import { fit } from '../../src/fit/fit.js';
import { appData } from './data.js';

describe('AppData', () => {

    test('toFITjs', () => {
        const res = fit.localActivity.toFITjs({
            records: appData.records,
            laps: appData.laps,
        });

        expect(res[0]).toMatchObject({type: 'header', dataType: '.FIT'});
        expect(res.some(record => record.name === 'file_id')).toBe(true);
        expect(res.filter(record => record.name === 'record' && record.type === 'data')).toHaveLength(appData.records.length);
    });

    test('encode', () => {
        // res: Dataview
        const res = fit.localActivity.encode({
            records: appData.records,
            laps: appData.laps,
        });
        // resArray: [Int]
        const resArray = dataviewToArray(res);

        const decoded = fit.FITjs.decode(res);
        expect(decoded.filter(record => record.name === 'record' && record.type === 'data')).toHaveLength(appData.records.length);

        // check CRC
        var headerCRC     = fit.CRC.calculateCRC(
            res, 0, 11);
        var fileCRC       = fit.CRC.calculateCRC(
            new DataView(new Uint8Array(resArray).buffer),
            0,
            (resArray.length - 1) - fit.CRC.size,
        );
        var headerCRCArray = fit.CRC.toArray(headerCRC);
        var fileCRCArray   = fit.CRC.toArray(fileCRC);

        console.log(`header crc: ${headerCRC} `, headerCRCArray);
        console.log(`file crc: ${fileCRC} `, fileCRCArray);

        var resHeaderCRCArray = fit.CRC.getHeaderCRC(res).array;

        var resFileCRCArray = fit.CRC.getFileCRC(res).array;

        expect(resHeaderCRCArray).toEqual(headerCRCArray);

        expect(resFileCRCArray).toEqual(fileCRCArray);
        // check CRC
    });

    test('decode', () => {
        const view = fit.localActivity.encode({
            records: appData.records,
            laps: appData.laps,
        });

        const res = fit.FITjs.decode(view);

        expect(res[0]).toMatchObject({type: 'header', dataType: '.FIT'});
        expect(res.at(-1)).toMatchObject({type: 'crc'});
        expect(res.filter(record => record.name === 'record' && record.type === 'data')).toHaveLength(appData.records.length);
    });
});

