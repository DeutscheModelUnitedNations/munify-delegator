import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isParticipantOf,
	isSystemAdmin,
	isTeamMemberOf,
	PROJECT_MANAGEMENT_ROLES,
	publicConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import type { FileField } from '#api/handlers/storedFile/fileSources';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import type { ConferenceUpdateArgs } from './conferenceService';

/** Columns only the conference's participants and team read: bank details, postal address, templates. */
const MEMBERS_ONLY = {
	bankAccountHolder: false,
	iban: false,
	bic: false,
	bankName: false,
	postalName: false,
	postalStreet: false,
	postalApartment: false,
	postalZip: false,
	postalCity: false,
	postalCountry: false,
	contractFileId: false,
	guardianConsentFileId: false,
	mediaConsentFileId: false,
	termsAndConditionsFileId: false,
	certificateFileId: false,
	documentLayouts: false
};
/** Columns only the conference's team reads: links to its internal tools. */
const TEAM_ONLY = { linkToTeamWiki: false, linkToServicesPage: false };

export function registerConferenceAbilities() {
	// Anyone (signed in or not) reads the public conferences - open for registration or, from the
	// assignment on, for the waiting list - without the members-only and team-only columns. Any other
	// conference is read only by those who have a part in it (the rules below).
	abilityBuilder.conference.allow('read').when(() => ({
		where: publicConference,
		columns: { ...MEMBERS_ONLY, ...TEAM_ONLY }
	}));
	abilityBuilder.conference.allow('read').when(systemAdmin);

	// Its registered participants (delegates, single participants, supervisors) read their
	// conference with the members-only columns, without the team-only ones.
	abilityBuilder.conference.allow('read').when((ctx) => {
		const participant = isParticipantOf(ctx);
		return participant ? { where: participant, columns: TEAM_ONLY } : undefined;
	});

	// Every team member reads their conference in full.
	abilityBuilder.conference.allow('read').when((ctx) => grantWhere(isTeamMemberOf({ ctx })));

	// Project management updates and deletes its conference. Content roles edit a part of it through
	// `assertCanUpdateConference`, not this ability.
	abilityBuilder.conference
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOf({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));
}

/**
 * Refuses unless the caller is participant care (project management and participant care) of the
 * conference, who hand out the document numbers on the postal page; the next number tells how many
 * were handed out so far.
 */
export async function assertCanReadNextDocumentNumber({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * The arguments of `updateConference` the content roles (`editConferenceContent`: project
 * management, participant care, content lead) may send: links, postal address, templates, the
 * participants' announcement, the conference status and the feature switches.
 */
const CONFERENCE_CONTENT_ARGS: readonly string[] = [
	'id',
	// the announcement page (`team/announcement`) is participant care's as much as management's
	'info',
	'showInfoExpanded',
	'linkToPreparationGuide',
	'linkToTeamWiki',
	'linkToServicesPage',
	'postalName',
	'postalStreet',
	'postalApartment',
	'postalZip',
	'postalCity',
	'postalCountry',
	'contractFileId',
	'guardianConsentFileId',
	'mediaConsentFileId',
	'termsAndConditionsFileId',
	'certificateFileId',
	'state',
	'unlockPayments',
	'unlockPostals',
	'isOpenPaperSubmission',
	'showCalendar'
];

/**
 * Refuses unless the caller may send these arguments to `updateConference`: anything if the
 * conference's update ability matches (project management), otherwise only `CONFERENCE_CONTENT_ARGS`
 * and only with `editConferenceContent`. Any other argument is refused, not ignored.
 */
export async function assertCanUpdateConference({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: ConferenceUpdateArgs;
}) {
	const updateFilter = (await ctx.abilities.conference.filter('update')).merge({
		where: { id: args.id }
	});
	const mayEditAll = !!(await db.query.conference.findFirst({
		where: updateFilter.query.single.where,
		columns: { id: true }
	}));
	if (mayEditAll) return;

	await assertTeamPermission({ ctx, conferenceId: args.id, permission: 'editConferenceContent' });
	const forbidden = Object.entries(args).filter(
		([key, value]) => value !== undefined && !CONFERENCE_CONTENT_ARGS.includes(key)
	);
	if (forbidden.length > 0) {
		throw apiError({
			code: 'FORBIDDEN',
			message: m.conferenceChangeProjectManagementOnly({
				fields: forbidden.map(([key]) => key).join(', ')
			})
		});
	}
}

/**
 * Refuses unless the caller uploaded every file `updateConference` is asked to store, for that field
 * of this conference (`assertCanClaimFile`).
 */
export async function assertCanClaimConferenceFiles({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: ConferenceUpdateArgs;
}) {
	const claim = ({
		field,
		fileId
	}: {
		field: FileField<'conference'>;
		fileId: string | null | undefined;
	}) =>
		assertCanClaimFile({
			ctx,
			fileId,
			target: { kind: 'conference', field, conferenceId: args.id }
		});
	await claim({ field: 'image', fileId: args.imageFileId });
	await claim({ field: 'emblem', fileId: args.emblemFileId });
	await claim({ field: 'logo', fileId: args.logoFileId });
	await claim({ field: 'contract', fileId: args.contractFileId });
	await claim({ field: 'guardianConsent', fileId: args.guardianConsentFileId });
	await claim({ field: 'mediaConsent', fileId: args.mediaConsentFileId });
	await claim({ field: 'termsAndConditions', fileId: args.termsAndConditionsFileId });
	await claim({ field: 'certificate', fileId: args.certificateFileId });
}

/**
 * Refuses unless the caller holds `editConferenceContent` (project management, participant care,
 * content lead) in the conference: the layout goes with the templates it is placed on.
 */
export async function assertCanSetDocumentLayout({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'editConferenceContent' });
}

/** The error `updateConference` answers when its write matched no row, i.e. the caller may not update it. */
export function conferenceUpdateRefused() {
	return apiError({ code: 'FORBIDDEN', message: m.accessDeniedProjectManagement() });
}

/** Refuses unless the caller is a system admin, the only one who creates a conference from a seeding document. */
export function assertCanSeedConference(ctx: ApiContext) {
	if (!isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.unauthorized({ error: 'User is not admin' }) });
	}
}

/**
 * Refuses unless the caller is participant care (project management and participant care) of the
 * conference, whose tool the plausibility page is.
 */
export async function assertCanReadPlausibility({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
