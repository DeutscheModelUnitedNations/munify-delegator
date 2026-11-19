import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ paperReviewDraftPubsub: {} }));

const {
	changedSinceSeen,
	conflictUpdate,
	writeRefusal,
	replacesAppEdits,
	reviewDraftLink,
	reviewDraftMarkdownSchema
} = await import('./paperReviewDraftService');

describe('changedSinceSeen', () => {
	const seen = new Date('2026-11-19T10:00:00.123Z');

	it('passes the draft the editor saw, and none when it saw none', () => {
		expect(
			changedSinceSeen({ draft: { updatedAt: new Date(seen) }, expectedUpdatedAt: seen })
		).toBe(false);
		expect(changedSinceSeen({ draft: undefined, expectedUpdatedAt: null })).toBe(false);
	});

	it('refuses a draft saved, created or discarded elsewhere meanwhile', () => {
		const later = new Date('2026-11-19T10:00:01.000Z');
		expect(changedSinceSeen({ draft: { updatedAt: later }, expectedUpdatedAt: seen })).toBe(true);
		expect(changedSinceSeen({ draft: { updatedAt: later }, expectedUpdatedAt: null })).toBe(true);
		expect(changedSinceSeen({ draft: undefined, expectedUpdatedAt: seen })).toBe(true);
	});
});

describe('replacesAppEdits', () => {
	it('stops an assistant from replacing what the reviewer edited in the app', () => {
		expect(
			replacesAppEdits({ draft: { lastEditedVia: 'UI' }, by: 'MCP', overwriteAppEdits: false })
		).toBe(true);
	});

	it('lets it when told to, or when the draft is its own or there is none', () => {
		expect(
			replacesAppEdits({ draft: { lastEditedVia: 'UI' }, by: 'MCP', overwriteAppEdits: true })
		).toBe(false);
		expect(
			replacesAppEdits({ draft: { lastEditedVia: 'MCP' }, by: 'MCP', overwriteAppEdits: false })
		).toBe(false);
		expect(replacesAppEdits({ draft: undefined, by: 'MCP', overwriteAppEdits: false })).toBe(false);
	});

	it('never stops the reviewer', () => {
		expect(
			replacesAppEdits({ draft: { lastEditedVia: 'MCP' }, by: 'UI', overwriteAppEdits: false })
		).toBe(false);
	});
});

describe('the draft arguments', () => {
	it('refuses an empty text and trims', () => {
		expect(reviewDraftMarkdownSchema.safeParse('  ').success).toBe(false);
		expect(reviewDraftMarkdownSchema.parse(' Gut. ')).toBe('Gut.');
	});

	it('links to the paper’s review editor', () => {
		expect(
			reviewDraftLink({ origin: 'https://delegator.dmun.de', conferenceId: 'c1', paperId: 'p1' })
		).toBe('https://delegator.dmun.de/dashboard/c1/paperhub/p1#review');
	});
});

describe('conflictUpdate', () => {
	const now = new Date('2026-11-18T12:00:00Z');
	const comments = { type: 'doc' };

	it('starts an assistant’s draft over, for the latest version', () => {
		expect(
			conflictUpdate({
				startsOver: true,
				paperVersionId: 'v2',
				comments,
				statusAfter: 'ACCEPTED',
				by: 'MCP',
				now
			})
		).toEqual({
			comments,
			statusAfter: 'ACCEPTED',
			lastEditedVia: 'MCP',
			updatedAt: now,
			paperVersionId: 'v2',
			origin: 'MCP',
			createdAt: now
		});
	});

	it('keeps version, origin and creation time when the reviewer edits', () => {
		expect(
			conflictUpdate({
				startsOver: false,
				paperVersionId: 'v2',
				comments,
				statusAfter: 'CHANGES_REQUESTED',
				by: 'UI',
				now
			})
		).toEqual({ comments, statusAfter: 'CHANGES_REQUESTED', lastEditedVia: 'UI', updatedAt: now });
	});
});

describe('writeRefusal', () => {
	const at = new Date('2026-11-19T10:00:00.000Z');
	const appDraft = { lastEditedVia: 'UI' as const, updatedAt: at };

	it('keeps an assistant off what the reviewer changed in the app', () => {
		expect(
			writeRefusal({ draft: appDraft, by: 'MCP', overwriteAppEdits: false, expected: undefined })
		).toBe('EDITED_IN_APP');
		expect(
			writeRefusal({ draft: appDraft, by: 'MCP', overwriteAppEdits: true, expected: undefined })
		).toBeUndefined();
	});

	it('keeps the editor off a draft it has not seen', () => {
		expect(
			writeRefusal({
				draft: appDraft,
				by: 'UI',
				overwriteAppEdits: false,
				expected: { updatedAt: new Date('2026-11-19T09:00:00.000Z') }
			})
		).toBe('CHANGED_ELSEWHERE');
		expect(
			writeRefusal({
				draft: appDraft,
				by: 'UI',
				overwriteAppEdits: false,
				expected: { updatedAt: at }
			})
		).toBeUndefined();
		expect(
			writeRefusal({ draft: appDraft, by: 'UI', overwriteAppEdits: false, expected: undefined })
		).toBeUndefined();
	});
});
