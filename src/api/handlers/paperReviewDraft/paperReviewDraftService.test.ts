import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ paperReviewDraftPubsub: {} }));

const { replacesAppEdits, reviewDraftLink, reviewDraftMarkdownSchema } =
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
