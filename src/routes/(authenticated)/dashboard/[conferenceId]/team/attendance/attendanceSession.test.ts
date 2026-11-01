import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, test } from 'vitest';
import {
	findLogged,
	fullName,
	hasScanOf,
	hasUnsynced,
	isShownPerson,
	scanStep,
	isAlreadyScanned,
	isNameTaken,
	queueFromEntries,
	renameTargets,
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
		expect(
			scanErrorText({ err: new TypeError('x'), offlineText: 'offline', fallback: 'generic' })
		).toBe('offline');
		expect(
			scanErrorText({ err: new Error('boom'), offlineText: 'offline', fallback: 'generic' })
		).toBe('boom');
		expect(scanErrorText({ err: 'x', offlineText: 'offline', fallback: 'generic' })).toBe(
			'generic'
		);
	});

	test('isAlreadyScanned reads the error code, not the message', () => {
		const refused = (code: string, message: string) =>
			new CombinedError({
				graphQLErrors: [new GraphQLError(message, { extensions: { code } })]
			});
		expect(isAlreadyScanned(refused('ALREADY_SCANNED', 'Schon eingecheckt'))).toBe(true);
		expect(isAlreadyScanned(refused('EMAIL_CONFLICT', 'Already scanned in this session'))).toBe(
			false
		);
		expect(isAlreadyScanned(new Error('Already scanned in this session'))).toBe(false);
		expect(isAlreadyScanned('ALREADY_SCANNED')).toBe(false);
	});

	test('isNameTaken reads the conflict code the server refuses a taken name with', () => {
		const refused = (code: string) =>
			new CombinedError({
				graphQLErrors: [new GraphQLError('Name taken', { extensions: { code } })]
			});
		expect(isNameTaken(refused('CONFLICT'))).toBe(true);
		expect(isNameTaken(refused('NOT_FOUND'))).toBe(false);
		expect(isNameTaken(new Error('Name taken'))).toBe(false);
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
		expect(hasScanOf({ entries: undefined, userId: 'u1' })).toBe(false);
		expect(hasScanOf({ entries, userId: 'u1' })).toBe(true);
		expect(hasScanOf({ entries, userId: 'u1', syncedOnly: true })).toBe(false);
		expect(hasScanOf({ entries, userId: 'u2', syncedOnly: true })).toBe(true);
		expect(findLogged({ entries, userId: 'u2', timestamp: 't2' })).toBe(entries[1]);
		expect(findLogged({ entries, userId: 'u2', timestamp: 't1' })).toBeUndefined();
		expect(findLogged({ entries: undefined, userId: 'u2', timestamp: 't2' })).toBeUndefined();
	});

	test('queueFromEntries keeps only unsynced scans as pending', () => {
		const queue = queueFromEntries([entry(), entry({ userId: 'u2', synced: true })]);
		expect(queue).toHaveLength(1);
		expect(queue[0]).toMatchObject({ userId: 'u1', status: 'pending', retryCount: 0 });
	});

	test('scanIntake', () => {
		expect(scanIntake({ code: 'a', held: null, active: false })).toEqual({ action: 'ignore' });
		expect(scanIntake({ code: 'a', held: 'b', active: true })).toEqual({
			action: 'hold',
			held: 'b'
		});
		expect(scanIntake({ code: '  ', held: null, active: true })).toEqual({ action: 'ignore' });
		expect(scanIntake({ code: ' a ', held: null, active: true })).toEqual({
			action: 'take',
			trimmed: 'a'
		});
	});

	test('scanStep', () => {
		expect(scanStep({ passed: true })).toBeNull();
		expect(scanStep({ passed: false })).toBe('ack');
		expect(scanStep({ passed: false, decides: true })).toBe('decide');
		expect(scanStep({ passed: true, decides: true })).toBeNull();
	});

	test('isShownPerson', () => {
		expect(isShownPerson(null)).toBe(false);
		expect(isShownPerson({ state: 'loading', userId: 'u' })).toBe(false);
	});

	test('renameTargets', () => {
		const local: ScanSession = {
			id: 's1',
			occasion: 'Day 1',
			conferenceId: 'c',
			startedAt: 't',
			started: false,
			mode: 'CHECK',
			entries: []
		};
		// not on the server yet: it starts under the new name
		expect(renameTargets({ local, id: 's1' })).toEqual({ server: false, local });
		expect(renameTargets({ local: { ...local, started: true }, id: 's1' }).server).toBe(true);
		// another device's session
		expect(renameTargets({ local, id: 's2' })).toEqual({ server: true, local: null });
		expect(renameTargets({ local: null, id: 's2' })).toEqual({ server: true, local: null });
	});
});
