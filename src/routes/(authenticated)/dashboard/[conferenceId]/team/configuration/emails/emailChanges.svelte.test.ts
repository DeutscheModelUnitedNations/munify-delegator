import { describe, expect, test } from 'vitest';
import { createEmailChanges, emailConfigChanges } from './emailChanges.svelte';

describe('createEmailChanges', () => {
	test('holds a switch until saved, and drops it when switched back', () => {
		const changes = createEmailChanges();
		changes.stage({
			change: { kind: 'POSTAL_RECEIVED', enabled: true, notifyExisting: true, openCount: 0 },
			stored: false
		});
		expect(changes.enabledOf('POSTAL_RECEIVED', false)).toBe(true);
		expect(changes.has('POSTAL_RECEIVED')).toBe(true);

		changes.stage({
			change: { kind: 'POSTAL_RECEIVED', enabled: false, notifyExisting: false, openCount: 0 },
			stored: false
		});
		expect(changes.has('POSTAL_RECEIVED')).toBe(false);
		expect(changes.enabledOf('POSTAL_RECEIVED', false)).toBe(false);
	});

	test('saving clears the switches and counts the save', () => {
		const changes = createEmailChanges();
		changes.stage({
			change: { kind: 'PAYMENT_RECEIVED', enabled: false, notifyExisting: false, openCount: 0 },
			stored: true
		});
		changes.saved();
		expect(changes.list).toEqual([]);
		expect(changes.revision).toBe(1);
	});
});

describe('emailConfigChanges', () => {
	test('marks a switch that sends right away as high impact', () => {
		const [sends, futureOnly, off] = emailConfigChanges([
			{ kind: 'POSTAL_RECEIVED', enabled: true, notifyExisting: true, openCount: 4 },
			{ kind: 'PAYMENT_RECEIVED', enabled: true, notifyExisting: false, openCount: 2 },
			{ kind: 'POSTAL_UNLOCKED', enabled: false, notifyExisting: false, openCount: 0 }
		]);
		expect(sends).toMatchObject({
			key: 'email:POSTAL_RECEIVED',
			group: 'emails',
			highImpact: true
		});
		expect(sends.note).toBeTruthy();
		expect(futureOnly).toMatchObject({ highImpact: false });
		expect(futureOnly.note).toBeTruthy();
		expect(off).toMatchObject({ highImpact: false, note: undefined });
	});
});
