import type { PaperstatusEnum, PapertypeEnum } from '#lib/api/rumbleClient/client.js';

const paperTypeIcons: Record<PapertypeEnum, string> = {
	POSITION_PAPER: 'fa-file',
	WORKING_PAPER: 'fa-scroll',
	INTRODUCTION_PAPER: 'fa-megaphone'
};

const paperStatusIcons: Record<PaperstatusEnum, string> = {
	SUBMITTED: 'fa-paper-plane',
	REVISED: 'fa-rotate',
	CHANGES_REQUESTED: 'fa-exclamation-triangle',
	ACCEPTED: 'fa-check-circle',
	DRAFT: 'fa-file-alt'
};

/** A value the client does not know yet (a newer API) falls back to a plain document. */
export function getPaperTypeIcon(type: PapertypeEnum) {
	return paperTypeIcons[type] ?? 'fa-file-alt';
}

export function getPaperStatusIcon(s: PaperstatusEnum) {
	return paperStatusIcons[s] ?? 'fa-file-alt';
}
