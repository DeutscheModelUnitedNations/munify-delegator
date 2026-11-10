import { describe, expect, test } from 'vitest';
import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { m } from '#lib/paraglide/messages';
import { chaseSyncNotice } from './chaseSync';

const ok = (value: boolean) => ({ status: 'fulfilled' as const, value });
const failed = (reason: unknown) => ({ status: 'rejected' as const, reason });
const conflict = (message: string) =>
	new CombinedError({
		graphQLErrors: [new GraphQLError(message, { extensions: { code: 'CONFLICT' } })]
	});

describe('chaseSyncNotice', () => {
	test('is a sync on both sides when both accept', () => {
		expect(chaseSyncNotice({ here: ok(true), remote: ok(true) })).toEqual({
			level: 'success',
			message: m.chaseLinkSyncRequested()
		});
	});

	test('a CHASE that cannot be reached does not fail the sync here, and says why', () => {
		expect(chaseSyncNotice({ here: ok(true), remote: failed(conflict('CHASE is away')) })).toEqual({
			level: 'warning',
			message: m.chaseLinkSyncRequestedHereOnly({ reason: 'CHASE is away' })
		});
		expect(chaseSyncNotice({ here: ok(true), remote: failed(new Error('offline')) })).toEqual({
			level: 'warning',
			message: m.chaseLinkSyncRequestedHereOnly({ reason: m.chaseLinkSyncRemoteFailed() })
		});
		expect(chaseSyncNotice({ here: ok(true), remote: ok(false) }).level).toBe('warning');
	});

	test('fails only when the request here fails', () => {
		expect(chaseSyncNotice({ here: failed(new Error('x')), remote: ok(true) }).level).toBe('error');
	});

	test('says there is no link when this instance has none', () => {
		expect(chaseSyncNotice({ here: ok(false), remote: ok(false) })).toEqual({
			level: 'error',
			message: m.chaseLinkSyncNoLink()
		});
	});
});
