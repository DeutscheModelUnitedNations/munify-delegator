import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ paperReviewDraftPubsub: {} }));

const { conflictUpdate, replacesAppEdits, reviewDraftLink, reviewDraftMarkdownSchema } =
	await import('./paperReviewDraftService');

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
