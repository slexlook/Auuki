/**
 * @jest-environment jsdom
 */

import { calculateWorkoutPSS, intervalPSS, rampPSS, workoutTemplate } from '../../src/views/workout-list.js';
import { CadenceTarget } from '../../src/views/data-views.js';

describe('Workout list PSS', () => {
    test('calculates steady state PSS from intensity squared and duration hours', () => {
        const interval = {
            duration: 6 * 60,
            steps: [{duration: 6 * 60, power: 0.5}],
        };

        expect(intervalPSS(interval)).toBe(0.025);
    });

    test('calculates ramp-like intervals from start and end intensities', () => {
        const interval = {
            duration: 30 * 60,
            steps: [
                {duration: 10, power: 0.5},
                {duration: 10, power: 0.8},
            ],
        };

        expect(intervalPSS(interval)).toBeCloseTo(0.5 * ((0.5 * 0.5) + (0.5 * 0.8) + (0.8 * 0.8)) / 3);
    });

    test('calculates linearly changing intensity from the integrated squared intensity', () => {
        expect(rampPSS(0.5, 0.8, 0.5)).toBeCloseTo(0.215);
        expect(rampPSS(0.8, 0.5, 0.5)).toBeCloseTo(0.215);
    });

    test('sums and formats workout PSS for the list', () => {
        const workout = {
            id: 'pss-test',
            meta: {
                name: 'PSS Test',
                category: 'Sweet Spot',
                duration: 36 * 60,
                description: '',
            },
            intervals: [
                {duration: 6 * 60, steps: [{duration: 6 * 60, power: 0.5}]},
                {duration: 30 * 60, steps: [{duration: 10, power: 0.5}, {duration: 10, power: 0.8}]},
            ],
            pss: calculateWorkoutPSS({
                intervals: [
                    {duration: 6 * 60, steps: [{duration: 6 * 60, power: 0.5}]},
                    {duration: 30 * 60, steps: [{duration: 10, power: 0.5}, {duration: 10, power: 0.8}]},
                ],
            }),
        };

        expect(workout.pss).toBe(24);
        expect(workoutTemplate(workout)).toContain('<div class="workout--pss">PSS 24</div>');
    });
});

describe('Cadence target display', () => {
    test('renders cadence target as a current over target suffix', () => {
        const view = new CadenceTarget();

        expect(view.transform(0)).toBe('');
        expect(view.transform(90)).toBe('/ 90');
    });
});