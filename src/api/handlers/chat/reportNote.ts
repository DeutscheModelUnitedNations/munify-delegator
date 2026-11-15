import { z } from 'zod';
import { CHAT_REPORT_NOTE_MAX_LENGTH } from '#lib/helpers/chat';
import { m } from '#lib/paraglide/messages';

/** The note participant care may leave when settling a chat's reports: optional, and not endless. */
export const reportNoteSchema = z
	.string()
	.trim()
	.max(CHAT_REPORT_NOTE_MAX_LENGTH, {
		error: () => m.chatReportNoteTooLong({ max: CHAT_REPORT_NOTE_MAX_LENGTH })
	})
	.nullish();
