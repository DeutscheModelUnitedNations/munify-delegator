import { datetimeLocalToDate } from '#lib/helpers/conferenceTimezoneDate';
import {
	audienceInput,
	type AnnouncementImportance,
	type Audience
} from '#lib/helpers/announcements';

/** What the editor holds of an announcement. */
export interface AnnouncementForm {
	title: string;
	body: string;
	signature: string;
	importance: AnnouncementImportance;
	pinned: boolean;
	notifyByMail: boolean;
	/** A `datetime-local` value in the conference's time zone; empty for "no end". */
	visibleUntil: string;
	audiences: readonly Audience[];
}

/**
 * The editor's form as the API takes it: an empty signature and an empty end clear theirs, the
 * end is read in the conference's time zone, and the files are the kept ones followed by the
 * uploads that arrived.
 */
export function announcementValues({
	form,
	timezone,
	keptFileIds,
	uploadedFileIds
}: {
	form: AnnouncementForm;
	timezone: string;
	keptFileIds: readonly string[];
	uploadedFileIds: readonly (string | null | undefined)[];
}) {
	return {
		title: form.title,
		body: form.body,
		signature: form.signature.trim() || null,
		importance: form.importance,
		pinned: form.pinned,
		notifyByMail: form.notifyByMail,
		visibleUntil: form.visibleUntil
			? datetimeLocalToDate({ datetimeLocal: form.visibleUntil, timezone })
			: null,
		audiences: form.audiences.map(audienceInput),
		attachmentFileIds: [...keptFileIds, ...uploadedFileIds.flatMap((id) => (id ? [id] : []))]
	};
}
