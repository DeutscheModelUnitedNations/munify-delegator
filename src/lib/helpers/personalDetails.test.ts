import { describe, expect, test } from 'vitest';
import { findPersonalDetails, sendStep } from './personalDetails';

describe('findPersonalDetails', () => {
	test('finds phone numbers in the usual spellings', () => {
		for (const text of [
			'Ruf mich an: 0171 1234567',
			'+49 171 1234567',
			'0049-171-1234567',
			'+49 (0) 30 / 123 456',
			'meine nummer ist 01711234567!'
		]) {
			expect(findPersonalDetails(text), text).toEqual(['PHONE']);
		}
	});

	test('leaves dates, times, clause numbers and short numbers alone', () => {
		for (const text of [
			'Treffen am 01.03.2026 um 10:30',
			'Siehe Absatz 3, Ziffer 0.5',
			'Resolution 2334 (2016) des Sicherheitsrats',
			'Raum 0815',
			'Wir sind 12 Delegierte',
			'Version 1.0.2'
		]) {
			expect(findPersonalDetails(text), text).toEqual([]);
		}
	});

	test('does not count numbers that run into words', () => {
		expect(findPersonalDetails('Code ABC01711234567')).toEqual([]);
	});

	test('finds email addresses, also with "(at)"', () => {
		expect(findPersonalDetails('schreib an anna.muster@example.org')).toEqual(['EMAIL']);
		expect(findPersonalDetails('anna (at) example.de')).toEqual(['EMAIL']);
		expect(findPersonalDetails('jörg[at]müller.de')).toEqual(['EMAIL']);
	});

	test('a bare "@" is no address', () => {
		expect(findPersonalDetails('@Frankreich was meint ihr?')).toEqual([]);
		expect(findPersonalDetails('Treffen @ Raum 3')).toEqual([]);
	});

	test('finds messenger and social media links', () => {
		expect(findPersonalDetails('https://wa.me/491711234567')).toEqual(['MESSENGER']);
		expect(findPersonalDetails('folg mir: instagram.com/anna')).toEqual(['MESSENGER']);
		expect(findPersonalDetails('t.me/annamuster')).toEqual(['MESSENGER']);
		expect(findPersonalDetails('Quelle: https://www.un.org/en/')).toEqual([]);
	});

	test('reports every kind once', () => {
		expect(findPersonalDetails('a@b.de oder c@d.de, 0171 1234567 oder 0172 7654321')).toEqual([
			'PHONE',
			'EMAIL'
		]);
	});
});

describe('sendStep', () => {
	const args = { sending: false, confirmed: null };

	test('waits while there is nothing to send or a message is on its way', () => {
		expect(sendStep({ ...args, body: '' })).toBe('wait');
		expect(sendStep({ ...args, body: 'Hallo', sending: true })).toBe('wait');
	});

	test('sends a message without contact details', () => {
		expect(sendStep({ ...args, body: 'Hallo' })).toBe('send');
	});

	test('warns about contact details until the writer confirms that very text', () => {
		const body = 'Ruf mich an: 0171 1234567';
		expect(sendStep({ ...args, body })).toBe('warn');
		expect(sendStep({ ...args, body, confirmed: body })).toBe('send');
		expect(sendStep({ ...args, body: `${body}!`, confirmed: body })).toBe('warn');
	});
});
