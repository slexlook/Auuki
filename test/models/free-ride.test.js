/**
 * @jest-environment jsdom
 */

import {
    FREE_RIDE_ID,
    createFreeRideWorkout,
    isFreeRideWorkout,
    models,
} from '../../src/models/models.js';

describe('Free ride workout', () => {
    global.console = {
        log: jest.fn(),
        error: console.error,
        warn: jest.fn(),
    };

    test('createFreeRideWorkout builds a marked sentinel workout', () => {
        const workout = createFreeRideWorkout();

        expect(workout.id).toBe(FREE_RIDE_ID);
        expect(workout.meta.freeRide).toBe(true);
        expect(workout.meta.name).toBe('Free ride');
        expect(workout.intervals).toEqual([]);
        expect(isFreeRideWorkout(workout)).toBe(true);
    });

    test('isFreeRideWorkout matches id or meta flag', () => {
        expect(isFreeRideWorkout({id: FREE_RIDE_ID, meta: {}})).toBe(true);
        expect(isFreeRideWorkout({id: 'other', meta: {freeRide: true}})).toBe(true);
        expect(isFreeRideWorkout({id: 'other', meta: {name: 'Dijon'}})).toBe(false);
        expect(isFreeRideWorkout(undefined)).toBe(false);
    });

    test('default workout list starts with Free ride', () => {
        const defaults = models.workouts.defaultValue();

        expect(isFreeRideWorkout(defaults[0])).toBe(true);
        expect(defaults[0].id).toBe(FREE_RIDE_ID);
    });

    test('Free ride cannot be removed from the library', () => {
        const workouts = [
            createFreeRideWorkout(),
            {id: 'user-1', meta: {name: 'Custom'}, intervals: []},
        ];

        const next = models.workouts.remove(workouts, FREE_RIDE_ID);

        expect(next).toHaveLength(2);
        expect(isFreeRideWorkout(next[0])).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    test('workout restore defaults to Free ride when no saved id', () => {
        const workouts = [
            createFreeRideWorkout(),
            {id: 'built-in:Dijon', meta: {name: 'Dijon'}, intervals: [{duration: 60, steps: []}]},
        ];

        expect(models.workout.restore({workouts}, '')).toEqual(workouts[0]);
        expect(models.workout.restore({workouts}, 'built-in:Dijon')).toEqual(workouts[1]);
    });
});
