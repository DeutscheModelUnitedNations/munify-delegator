import { expect, test } from 'vitest';
import { previewArgsOf } from './preview';

test('previewArgsOf reads the preview choice', () => {
	expect(previewArgsOf({ choice: 'DELEGATE:ga', draft: true })).toEqual({
		previewAs: 'DELEGATE',
		committeeId: 'ga',
		roleId: undefined,
		draft: true
	});
	expect(previewArgsOf({ choice: 'CUSTOM_ROLE:press', draft: false })).toMatchObject({
		previewAs: 'CUSTOM_ROLE',
		roleId: 'press'
	});
	expect(previewArgsOf({ choice: 'SUPERVISOR', draft: false }).previewAs).toBe('SUPERVISOR');
	expect(previewArgsOf({ choice: 'nonsense', draft: false }).previewAs).toBe('EVERYTHING');
});
