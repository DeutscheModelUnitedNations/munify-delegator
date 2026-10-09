import { describe, expect, test } from 'vitest';
import {
	findLogged,
	fullName,
	hasScanOf,
	hasUnsynced,
	isShownPerson,
	scanStep,
	isAlreadyScanned,
	queueFromEntries,
	scanErrorText,
	scanIntake,
	type ScanLogEntry,
	type ScanSession
} from './attendanceSession';

const entry = (over: Partial<ScanLogEntry> = {}): ScanLogEntry => ({
	userId: 'u1',
	timestamp: 't1',
	synced: false,
	checkPassed: true,
	...over
});

describe('attendanceSession', () => {
	test('fullName joins what is known', () => {
		expect(fullName({ givenName: 'Ada', familyName: 'Lovelace' })).toBe('Ada Lovelace');
		expect(fullName({ givenName: null, familyName: 'Lovelace' })).toBe('Lovelace');
		expect(fullName({})).toBe('');
	});

	test('scanErrorText prefers offline, then the message, then the fallback', () => {
		expect(scanErrorText(new TypeError('x'), 'offline', 'generic')).toBe('offline');
		expect(scanErrorText(new Error('boom'), 'offline', 'generic')).toBe('boom');
		expect(scanErrorText('x', 'offline', 'generic')).toBe('generic');
	});

	test('isAlreadyScanned reads the server message', () => {
		expect(isAlreadyScanned(new Error('Already scanned in this session'))).toBe(true);
		expect(isAlreadyScanned(new Error('other'))).toBe(false);
		expect(isAlreadyScanned('Already scanned')).toBe(false);
	});

	test('hasUnsynced', () => {
		const session = (entries: ScanLogEntry[]): ScanSession => ({
			id: 's',
			occasion: 'o',
			conferenceId: 'c',
			startedAt: 't',
			started: true,
			mode: 'CHECK',
			entries
		});
		expect(hasUnsynced(null)).toBe(false);
		expect(hasUnsynced(session([entry({ synced: true })]))).toBe(false);
		expect(hasUnsynced(session([entry()]))).toBe(true);
	});

	test('hasScanOf and findLogged', () => {
		const entries = [entry(), entry({ userId: 'u2', timestamp: 't2', synced: true })];
		expect(hasScanOf(undefined, 'u1')).toBe(false);
		expect(hasScanOf(entries, 'u1')).toBe(true);
		expect(hasScanOf(entries, 'u1', true)).toBe(false);
		expect(hasScanOf(entries, 'u2', true)).toBe(true);
		expect(findLogged(entries, 'u2', 't2')).toBe(entries[1]);
		expect(findLogged(entries, 'u2', 't1')).toBeUndefined();
		expect(findLogged(undefined, 'u2', 't2')).toBeUndefined();
	});

	test('queueFromEntries keeps only unsynced scans as pending', () => {
		const queue = queueFromEntries([entry(), entry({ userId: 'u2', synced: true })]);
		expect(queue).toHaveLength(1);
		expect(queue[0]).toMatchObject({ userId: 'u1', status: 'pending', retryCount: 0 });
	});

	test('scanIntake', () => {
		expect(scanIntake('a', null, false)).toEqual({ action: 'ignore' });
		expect(scanIntake('a', 'b', true)).toEqual({ action: 'hold', held: 'b' });
		expect(scanIntake('  ', null, true)).toEqual({ action: 'ignore' });
		expect(scanIntake(' a ', null, true)).toEqual({ action: 'take', trimmed: 'a' });
	});

	test('scanStep', () => {
		expect(scanStep(true, true)).toBe('badge');
		expect(scanStep(false, true)).toBeNull();
		expect(scanStep(false, false)).toBe('ack');
	});

	test('isShownPerson', () => {
		expect(isShownPerson(null)).toBe(false);
		expect(isShownPerson({ state: 'loading', userId: 'u' })).toBe(false);
	});
});
