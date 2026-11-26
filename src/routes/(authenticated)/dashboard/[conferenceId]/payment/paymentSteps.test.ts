import { describe, expect, test } from 'vitest';
import { paymentSteps } from './paymentSteps';

const NOTHING = {
	read: false,
	canPayForOthers: true,
	whoConfirmed: false,
	hasReference: false,
	hintsSeen: false,
	transferReported: false
};

describe('paymentSteps', () => {
	test('opens one step after the other, the done ones staying above it', () => {
		expect(paymentSteps(NOTHING).shown).toEqual([{ step: 'info', number: 1, done: false }]);
		expect(paymentSteps({ ...NOTHING, read: true }).open).toBe('who');
		expect(paymentSteps({ ...NOTHING, read: true, whoConfirmed: true }).open).toBe('reference');
		expect(paymentSteps({ ...NOTHING, read: true, hasReference: true }).open).toBe('hints');
		expect(paymentSteps({ ...NOTHING, read: true, hasReference: true, hintsSeen: true }).open).toBe(
			'transfer'
		);
		expect(
			paymentSteps({
				...NOTHING,
				read: true,
				hasReference: true,
				hintsSeen: true,
				transferReported: true
			}).shown
		).toEqual([
			{ step: 'info', number: 1, done: true },
			{ step: 'who', number: 2, done: true },
			{ step: 'reference', number: 3, done: true },
			{ step: 'hints', number: 4, done: true },
			{ step: 'transfer', number: 5, done: true },
			{ step: 'arrival', number: 6, done: false }
		]);
	});

	test('leaves out whom it is for where there is nobody else to pay for', () => {
		const { shown } = paymentSteps({ ...NOTHING, read: true, canPayForOthers: false });
		expect(shown).toEqual([
			{ step: 'info', number: 1, done: true },
			{ step: 'reference', number: 2, done: false }
		]);
	});

	test('a reference settles whom it is for', () => {
		expect(paymentSteps({ ...NOTHING, read: true, hasReference: true }).shown[1]).toEqual({
			step: 'who',
			number: 2,
			done: true
		});
	});

	test('the hints watched before are done, but come after the reference', () => {
		expect(paymentSteps({ ...NOTHING, read: true, whoConfirmed: true, hintsSeen: true }).open).toBe(
			'reference'
		);
	});

	test('a transfer taken back opens the transfer again', () => {
		const reported = {
			read: true,
			canPayForOthers: false,
			whoConfirmed: false,
			hasReference: true,
			hintsSeen: true
		};
		expect(paymentSteps({ ...reported, transferReported: true }).open).toBe('arrival');
		expect(paymentSteps({ ...reported, transferReported: false }).open).toBe('transfer');
	});
});
