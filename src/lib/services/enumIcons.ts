import type { PaperStatus$options, PaperType$options } from '$houdini';

export function getPaperTypeIcon(type: PaperType$options) {
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

export function getPaperStatusIcon(s: PaperStatus$options) {
	switch (s) {
		case 'SUBMITTED':
			return 'fa-paper-plane';
		case 'REVISED':
			return 'fa-sync';
		case 'CHANGES_REQUESTED':
			return 'fa-exclamation-triangle';
		case 'ACCEPTED':
			return 'fa-check-circle';
		case 'DRAFT':
		default:
			return 'fa-file-alt';
	}
}
