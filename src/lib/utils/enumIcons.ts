import type { PaperstatusEnum, PapertypeEnum } from '$lib/api/rumbleClient/client';

export function getPaperTypeIcon(type: PapertypeEnum) {
	switch (type) {
		case 'POSITION_PAPER':
			return 'fa-file';
		case 'WORKING_PAPER':
			return 'fa-scroll';
		case 'INTRODUCTION_PAPER':
			return 'fa-megaphone';
		default:
			return 'fa-file-alt';
	}
}

export function getPaperStatusIcon(s: PaperstatusEnum) {
	switch (s) {
		case 'SUBMITTED':
			return 'fa-paper-plane';
		case 'REVISED':
			return 'fa-rotate';
		case 'CHANGES_REQUESTED':
			return 'fa-exclamation-triangle';
		case 'ACCEPTED':
			return 'fa-check-circle';
		case 'DRAFT':
		default:
			return 'fa-file-alt';
	}
}
