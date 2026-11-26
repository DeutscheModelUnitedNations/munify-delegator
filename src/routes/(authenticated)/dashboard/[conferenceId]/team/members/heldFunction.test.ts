import { describe, expect, test } from 'vitest';
import { heldFunctionId } from './heldFunction';

const functions = [
	{ id: 'chair-ga', kind: 'CHAIR', committeeId: 'ga', roleId: null },
	{ id: 'press', kind: 'ROLE_SUPPORT', committeeId: null, roleId: 'press' },
	{ id: 'trusted', kind: 'TRUSTED_PERSON', committeeId: null, roleId: null }
];

describe('heldFunctionId', () => {
	test('finds a function by its kind and its committee or role', () => {
		expect(heldFunctionId({ functions, kind: 'CHAIR', committeeId: 'ga' })).toBe('chair-ga');
		expect(
			heldFunctionId({ functions, kind: 'ROLE_SUPPORT', committeeId: null, roleId: 'press' })
		).toBe('press');
		expect(heldFunctionId({ functions, kind: 'TRUSTED_PERSON', committeeId: null })).toBe(
			'trusted'
		);
	});

	test('answers nothing for a function not held', () => {
		expect(heldFunctionId({ functions, kind: 'CONSULTANT', committeeId: 'ga' })).toBeUndefined();
		expect(
			heldFunctionId({ functions, kind: 'ROLE_SUPPORT', committeeId: null, roleId: 'jury' })
		).toBeUndefined();
	});
});
