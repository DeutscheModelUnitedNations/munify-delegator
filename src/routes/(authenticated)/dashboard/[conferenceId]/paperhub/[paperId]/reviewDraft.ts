import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import type { JSONContent } from '@tiptap/core';
import { hasTextContent } from '../tiptapText';

/**
 * What the review editor says about the reviewer's draft (`paperReviewDraft`): who wrote it and
 * when, and whether it was written for an older version of the paper.
 */

type Via = 'MCP' | 'UI';

interface DraftFacts {
	origin: Via;
	lastEditedVia: Via;
	createdAt: Date | string;
	updatedAt: Date | string;
}

function formatTime(value: Date | string) {
	return new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
}

/** The lines of the notice above the editor: who created the draft, and who changed it since. */
export function draftNotice(draft: DraftFacts): string[] {
	const created = formatTime(draft.createdAt);
	const lines = [
		draft.origin === 'MCP'
			? m.reviewDraftByAssistant({ time: created })
			: m.reviewDraftByYou({ time: created })
	];
	if (draft.origin === 'MCP' && draft.lastEditedVia === 'UI') {
		lines.push(m.reviewDraftEditedByYou({ time: formatTime(draft.updatedAt) }));
	}
	return lines;
}

/** The warning for a draft written for an older version than the paper's latest, if it is. */
export function staleDraftWarning({
	draftVersion,
	currentVersion
}: {
	draftVersion: number;
	currentVersion: number;
}) {
	return draftVersion < currentVersion
		? m.reviewDraftStale({ draftVersion, currentVersion })
		: undefined;
}

/**
 * Whether the stored draft changed since the editor last loaded or saved it, by somebody else than
 * this editor: an assistant writing it again while the page is open.
 */
export function changedElsewhere({
	draft,
	knownUpdatedAt
}: {
	draft: { lastEditedVia: Via; updatedAt: Date | string } | null | undefined;
	knownUpdatedAt: number | undefined;
}) {
	if (!draft || draft.lastEditedVia !== 'MCP') return false;
	return new Date(draft.updatedAt).getTime() !== knownUpdatedAt;
}

/** Where saving the draft stands, shown below the editor. */
export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'failed';

const VERDICTS = ['CHANGES_REQUESTED', 'ACCEPTED'] as const;

/** Whether a status is one a review can give, the only ones a draft proposes. */
function isVerdict(status: string): status is (typeof VERDICTS)[number] {
	return VERDICTS.some((verdict) => verdict === status);
}

/**
 * What autosave should store, or undefined when there is nothing to: an empty editor, a status
 * that is no verdict, or exactly what was stored last (`savedSnapshot`).
 */
export function draftSnapshotToSave({
	comments,
	status,
	savedSnapshot
}: {
	comments: JSONContent;
	status: string;
	savedSnapshot: string | undefined;
}) {
	if (!hasTextContent(comments) || !isVerdict(status)) return undefined;
	const snapshot = JSON.stringify({ comments, status });
	return snapshot === savedSnapshot ? undefined : { snapshot, status };
}

/** Where the editor kept unsent reviews in the browser before drafts were stored on the server. */
export const legacyDraftKey = (paperId: string) => `reviewDraft_${paperId}`;

/**
 * A review the editor kept in the browser (`legacyDraftKey`) before drafts were stored on the
 * server, if the stored text holds one with text in it. The editor takes it over once, when the
 * paper has no server draft, and saves it as one.
 */
export function legacyBrowserDraft(stored: string | null) {
	if (!stored) return undefined;
	let value: unknown;
	try {
		value = JSON.parse(stored);
	} catch {
		return undefined;
	}
	if (typeof value !== 'object' || value === null) return undefined;
	const comments: unknown = 'comments' in value ? value.comments : undefined;
	const status: unknown = 'selectedStatus' in value ? value.selectedStatus : undefined;
	if (typeof comments !== 'object' || comments === null || !hasTextContent(comments)) {
		return undefined;
	}
	return { comments, status: typeof status === 'string' && isVerdict(status) ? status : undefined };
}
