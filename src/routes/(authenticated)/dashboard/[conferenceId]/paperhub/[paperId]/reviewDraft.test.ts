import { describe, expect, it } from 'vitest';
import {
	changedElsewhere,
	draftNotice,
	draftSnapshotToSave,
	legacyBrowserDraft,
	staleDraftWarning
} from './reviewDraft';

const created = '2026-11-18T09:00:00.000Z';
const updated = '2026-11-18T10:30:00.000Z';

describe('draftNotice', () => {
	it('names the assistant as the author of its draft', () => {
		const lines = draftNotice({
			origin: 'MCP',
			lastEditedVia: 'MCP',
			createdAt: created,
			updatedAt: created
		});
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatch(/KI-Assistent|AI assistant/);
	});

	it('adds when the reviewer changed an assistant’s draft', () => {
		const lines = draftNotice({
			origin: 'MCP',
			lastEditedVia: 'UI',
			createdAt: created,
			updatedAt: updated
		});
		expect(lines).toHaveLength(2);
	});

	it('speaks of the reviewer’s own draft', () => {
		const lines = draftNotice({
			origin: 'UI',
			lastEditedVia: 'UI',
			createdAt: created,
			updatedAt: updated
		});
		expect(lines).toHaveLength(1);
		expect(lines[0]).not.toMatch(/KI-Assistent|AI assistant/);
	});
});

describe('staleDraftWarning', () => {
	it('warns only about a draft for an older version', () => {
		expect(staleDraftWarning({ draftVersion: 2, currentVersion: 2 })).toBeUndefined();
		const warning = staleDraftWarning({ draftVersion: 1, currentVersion: 3 });
		expect(warning).toContain('1');
		expect(warning).toContain('3');
	});
});

describe('changedElsewhere', () => {
	it('notices an assistant writing the draft again', () => {
		const draft = { lastEditedVia: 'MCP' as const, updatedAt: updated };
		expect(changedElsewhere({ draft, knownUpdatedAt: new Date(created).getTime() })).toBe(true);
		expect(changedElsewhere({ draft, knownUpdatedAt: new Date(updated).getTime() })).toBe(false);
	});

	it('ignores the reviewer’s own saves and a missing draft', () => {
		expect(
			changedElsewhere({ draft: { lastEditedVia: 'UI', updatedAt: updated }, knownUpdatedAt: 0 })
		).toBe(false);
		expect(changedElsewhere({ draft: null, knownUpdatedAt: 0 })).toBe(false);
	});
});

describe('draftSnapshotToSave', () => {
	const text = {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gut.' }] }]
	};

	it('saves text with a verdict once', () => {
		const first = draftSnapshotToSave({
			comments: text,
			status: 'ACCEPTED',
			savedSnapshot: undefined
		});
		expect(first?.status).toBe('ACCEPTED');
		expect(
			draftSnapshotToSave({ comments: text, status: 'ACCEPTED', savedSnapshot: first?.snapshot })
		).toBeUndefined();
		expect(
			draftSnapshotToSave({
				comments: text,
				status: 'CHANGES_REQUESTED',
				savedSnapshot: first?.snapshot
			})
		).toBeDefined();
	});

	it('saves neither an empty editor nor a status that is no verdict', () => {
		expect(
			draftSnapshotToSave({
				comments: { type: 'doc', content: [{ type: 'paragraph' }] },
				status: 'ACCEPTED',
				savedSnapshot: undefined
			})
		).toBeUndefined();
		expect(
			draftSnapshotToSave({ comments: text, status: 'SUBMITTED', savedSnapshot: undefined })
		).toBeUndefined();
	});
});

describe('legacyBrowserDraft', () => {
	const comments = {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alt.' }] }]
	};

	it('takes over a review kept the old way, with its verdict', () => {
		expect(
			legacyBrowserDraft(JSON.stringify({ comments, selectedStatus: 'ACCEPTED', savedAt: 1 }))
		).toEqual({ comments, status: 'ACCEPTED' });
		expect(
			legacyBrowserDraft(JSON.stringify({ comments, selectedStatus: 'SUBMITTED' }))?.status
		).toBeUndefined();
	});

	it('ignores nothing, broken JSON and empty text', () => {
		expect(legacyBrowserDraft(null)).toBeUndefined();
		expect(legacyBrowserDraft('{')).toBeUndefined();
		expect(
			legacyBrowserDraft(JSON.stringify({ comments: { type: 'doc', content: [] } }))
		).toBeUndefined();
	});
});
