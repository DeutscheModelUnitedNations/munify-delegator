import type { PaperstatusEnum, PapertypeEnum } from '#lib/api/rumbleClient/client';

const paperTypeIcons: Record<PapertypeEnum, string> = {
	POSITION_PAPER: 'ph-file',
	WORKING_PAPER: 'ph-scroll',
	INTRODUCTION_PAPER: 'ph-megaphone-simple'
};

const paperStatusIcons: Record<PaperstatusEnum, string> = {
	SUBMITTED: 'ph-paper-plane-tilt',
	REVISED: 'ph-arrows-clockwise',
	CHANGES_REQUESTED: 'ph-warning',
	ACCEPTED: 'ph-check-circle',
	DRAFT: 'ph-file-text'
};

/** A value the client does not know yet (a newer API) falls back to a plain document. */
export function getPaperTypeIcon(type: PapertypeEnum) {
	return paperTypeIcons[type] ?? 'ph-file-text';
}

export function getPaperStatusIcon(s: PaperstatusEnum) {
	return paperStatusIcons[s] ?? 'ph-file-text';
}
