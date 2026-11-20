import { describe, expect, test } from 'vitest';
import { certificateSampleSessions } from './layoutElements';

const session = (occasion: string, day: number, showOnCertificate = true) => ({
	occasion,
	startedAt: new Date(Date.UTC(2026, 10, day)),
	showOnCertificate
});

describe('certificateSampleSessions', () => {
	test('lists the sessions kept on the certificates in the order they started', () => {
		expect(
			certificateSampleSessions([
				session('Abschluss', 3),
				session('Probelauf', 1, false),
				session(' Eröffnung ', 2)
			])
		).toEqual(['Eröffnung', 'Abschluss']);
	});

	test('lists none when no session is kept or named', () => {
		expect(certificateSampleSessions([session('Probelauf', 1, false), session('  ', 2)])).toEqual(
			[]
		);
	});
});
