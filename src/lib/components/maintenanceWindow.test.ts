import { describe, expect, test } from 'vitest';
import { maintenanceStatus } from './maintenanceWindow';

const at = (hour: number) => new Date(Date.UTC(2026, 0, 1, hour));

describe('maintenanceStatus', () => {
	test('no window', () => {
		expect(maintenanceStatus(undefined, at(12), at(10))).toBe('none');
		expect(maintenanceStatus(at(8), undefined, at(10))).toBe('none');
	});
	test('before, during and after the window', () => {
		expect(maintenanceStatus(at(11), at(12), at(10))).toBe('upcoming');
		expect(maintenanceStatus(at(10), at(12), at(10))).toBe('active');
		expect(maintenanceStatus(at(8), at(12), at(10))).toBe('active');
		expect(maintenanceStatus(at(8), at(10), at(10))).toBe('none');
		expect(maintenanceStatus(at(8), at(9), at(10))).toBe('none');
	});
});
