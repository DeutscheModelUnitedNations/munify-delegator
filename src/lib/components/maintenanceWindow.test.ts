import { describe, expect, test } from 'vitest';
import { maintenanceStatus } from './maintenanceWindow';

const at = (hour: number) => new Date(Date.UTC(2026, 0, 1, hour));

describe('maintenanceStatus', () => {
	test('no window', () => {
		expect(maintenanceStatus({ start: undefined, end: at(12), now: at(10) })).toBe('none');
		expect(maintenanceStatus({ start: at(8), end: undefined, now: at(10) })).toBe('none');
	});
	test('before, during and after the window', () => {
		expect(maintenanceStatus({ start: at(11), end: at(12), now: at(10) })).toBe('upcoming');
		expect(maintenanceStatus({ start: at(10), end: at(12), now: at(10) })).toBe('active');
		expect(maintenanceStatus({ start: at(8), end: at(12), now: at(10) })).toBe('active');
		expect(maintenanceStatus({ start: at(8), end: at(10), now: at(10) })).toBe('none');
		expect(maintenanceStatus({ start: at(8), end: at(9), now: at(10) })).toBe('none');
	});
});
