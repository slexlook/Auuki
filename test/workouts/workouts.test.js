/**
 * @jest-environment jsdom
 */

import {
    parseWorkoutList,
    zwoDirectoryUrl,
    zwoListUrl,
    zwoFileUrl,
    fetchDirectoryWorkoutList,
    fetchDirectoryWorkouts,
} from '../../src/workouts/workouts.js';

describe('Workouts', () => {

    global.console = {
        log: jest.fn(),
        error: console.error,
        warn: console.warn,
    };

    test('parseWorkoutList ignores blanks, comments, and unsafe paths', () => {
        expect(parseWorkoutList(`
            # comment
            one.zwo

            folder/two.zwo
            ../ignore.zwo
            /ignore.zwo
        `)).toEqual([
            'one.zwo',
            'folder/two.zwo',
        ]);
    });

    test('directory urls resolve relative to the current page', () => {
        expect(zwoDirectoryUrl('https://example.com/auuki/')).toBe('https://example.com/auuki/zwos/');
        expect(zwoListUrl('https://example.com/auuki/')).toBe('https://example.com/auuki/zwos/list.txt');
        expect(zwoFileUrl('one.zwo', 'https://example.com/auuki/')).toBe('https://example.com/auuki/zwos/one.zwo');
    });

    test('fetchDirectoryWorkoutList loads workout names from list.txt', async () => {
        const fetchMock = jest.fn(async () => ({
            ok: true,
            text: async () => 'one.zwo\n# skip\ntwo.zwo\n',
        }));

        await expect(fetchDirectoryWorkoutList(fetchMock, 'https://example.com/zwos/list.txt')).resolves.toEqual([
            'one.zwo',
            'two.zwo',
        ]);
    });

    test('fetchDirectoryWorkouts loads each listed zwo file', async () => {
        const fetchMock = jest.fn(async (url) => {
            if(url === 'https://example.com/auuki/zwos/list.txt') {
                return {
                    ok: true,
                    text: async () => 'one.zwo\ntwo.zwo\n',
                };
            }

            return {
                ok: true,
                text: async () => `<workout_file><name>${url}</name><workout></workout></workout_file>`,
            };
        });

        await expect(fetchDirectoryWorkouts(fetchMock, 'https://example.com/auuki/')).resolves.toEqual([
            {
                content: '<workout_file><name>https://example.com/auuki/zwos/one.zwo</name><workout></workout></workout_file>',
                fileName: 'one.zwo',
                source: 'directory',
            },
            {
                content: '<workout_file><name>https://example.com/auuki/zwos/two.zwo</name><workout></workout></workout_file>',
                fileName: 'two.zwo',
                source: 'directory',
            },
        ]);
    });

    test('fetchDirectoryWorkouts returns empty when list.txt is missing', async () => {
        const fetchMock = jest.fn(async () => ({ok: false, status: 404}));

        await expect(fetchDirectoryWorkouts(fetchMock, 'https://example.com/auuki/')).resolves.toEqual([]);
    });
});
