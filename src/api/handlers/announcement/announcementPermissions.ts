import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	CONFERENCE_CONTENT_ROLES,
	hop,
	isTeamMemberOfConference,
	systemAdmin,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { callerUserId } from '#api/services/authHelper/utils';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Who may do what with the conference's announcements.
 *
 * The rows themselves (drafts, schedules, audiences, who wrote them) are their editors': the
 * content roles of the conference (`editConferenceContent`: project management, participant care,
 * content lead) and a system admin. Everybody else reads announcements only through
 * `announcementFeed`, which answers what is out for the caller's own part in the conference, so
 * there is no read rule for readers here.
 */
export function registerAnnouncementAbilities() {
	abilityBuilder.announcement.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.announcement.allow(['read', 'update', 'delete']).when(liveWhere(editorOf));

	for (const part of [abilityBuilder.announcementAudience, abilityBuilder.announcementAttachment]) {
		part.allow('read').when(systemAdmin);
		part
			.allow('read')
			.when(liveWhere((args) => hop(editorOf(args), (announcement) => ({ announcement }))));
	}
}

/** Matches the announcements of the conferences the caller edits the content of. */
function editorOf(args: RuleArgs) {
	return isTeamMemberOfConference({ ...args, roles: CONFERENCE_CONTENT_ROLES });
}

/** Refuses unless the caller uploaded each file as an announcement attachment of the conference. */
async function assertCanAttach({
	ctx,
	conferenceId,
	fileIds
}: {
	ctx: ApiContext;
	conferenceId: string;
	fileIds: readonly string[] | null | undefined;
}) {
	for (const fileId of fileIds ?? []) {
		await assertCanClaimFile({
			ctx,
			fileId,
			target: { kind: 'announcement', field: 'attachment', conferenceId }
		});
	}
}

/**
 * Refuses unless the caller edits the conference's content (FORBIDDEN) and uploaded the
 * attachments for it (INVALID_INPUT). Returns the caller's id, the author.
 */
export async function assertCanCreateAnnouncement({
	ctx,
	conferenceId,
	attachmentFileIds
}: {
	ctx: ApiContext;
	conferenceId: string;
	attachmentFileIds?: readonly string[] | null;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'editConferenceContent' });
	await assertCanAttach({ ctx, conferenceId, fileIds: attachmentFileIds });
	return { userId: ctx.mustBeLoggedIn().sub };
}

/**
 * Refuses unless the announcement exists and the caller may change it (NOT_FOUND otherwise), and
 * uploaded the attachments it is given. Files it holds already may stay. Returns its conference
 * and the caller's id.
 */
export async function assertCanEditAnnouncement({
	ctx,
	id,
	attachmentFileIds
}: {
	ctx: ApiContext;
	id: string;
	attachmentFileIds?: readonly string[] | null;
}) {
	const user = ctx.mustBeLoggedIn();
	const announcement = await db.query.announcement.findFirst({
		...(await ctx.abilities.announcement.filter('update')).merge({ where: { id } }).query.single,
		columns: { conferenceId: true },
		with: { attachments: { columns: { fileId: true } } }
	});
	if (!announcement) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	const held = new Set(announcement.attachments.map((attachment) => attachment.fileId));
	await assertCanAttach({
		ctx,
		conferenceId: announcement.conferenceId,
		fileIds: attachmentFileIds?.filter((fileId) => !held.has(fileId))
	});
	return { conferenceId: announcement.conferenceId, userId: user.sub };
}

/**
 * Whose feed a caller reads: their own. Nobody's for a visitor, who gets an empty feed rather
 * than an error (the header asks on the public conference pages too), and nobody's for an AI
 * assistant, which takes no part in a conference itself.
 */
export function feedReader(ctx: ApiContext) {
	return callerUserId(ctx);
}
