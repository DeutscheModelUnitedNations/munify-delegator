import type { PaperStatus$options, PaperType$options } from '$houdini';
import { m } from '$lib/paraglide/messages';

export function translatePaperStatus(paperStatus: PaperStatus$options) {
	switch (paperStatus) {
		case 'DRAFT':
			return m.paperStatusDraft();
		case 'SUBMITTED':
			return m.paperStatusSubmitted();
		case 'CHANGES_REQUESTED':
			return m.paperStatusChangesRequested();
		case 'ACCEPTED':
			return m.paperStatusAccepted();
	}
}

export function translatePaperType(paperType: PaperType$options) {
	switch (paperType) {
		case 'POSITION_PAPER':
			return m.paperTypePositionPaper();
		case 'INTRODUCTION_PAPER':
			return m.paperTypeIntroductionPaper();
		case 'WORKING_PAPER':
			return m.paperTypeWorkingPaper();
	}
}
