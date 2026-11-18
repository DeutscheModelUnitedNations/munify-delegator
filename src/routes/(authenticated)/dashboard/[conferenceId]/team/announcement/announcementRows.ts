import { client } from '#lib/api/rumbleClient/client';

/** The conference's announcements as the team's page lists and edits them, newest first. */
export function fetchAnnouncements(conferenceId: string) {
	return client.liveQuery.announcements({
		__args: { where: { conferenceId: { eq: conferenceId } }, orderBy: { createdAt: 'desc' } },
		id: true,
		title: true,
		body: true,
		importance: true,
		pinned: true,
		signature: true,
		state: true,
		publishAt: true,
		visibleUntil: true,
		editedAt: true,
		notifyByMail: true,
		recipientCount: true,
		readCount: true,
		author: { givenName: true, familyName: true },
		publishedBy: { givenName: true, familyName: true },
		audiences: {
			kind: true,
			committeeId: true,
			roleId: true,
			surveyOptionId: true,
			teamRole: true
		},
		attachments: { position: true, file: { fileName: true, url: true } }
	});
}

export type AnnouncementRow = Awaited<ReturnType<typeof fetchAnnouncements>>[number];
