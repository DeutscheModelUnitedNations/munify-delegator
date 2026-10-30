import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isParticipantOf,
	isSystemAdmin,
	isTeamMemberOf,
	PROJECT_MANAGEMENT_ROLES,
	publicConference,
	systemAdmin,
	where
} from '#api/services/authHelper';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import type { FileField } from '#api/handlers/storedFile/fileSources';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';
import type { ConferenceUpdateArgs } from './conferenceService';

/** Where the fee goes, where postal documents go, and the documents themselves. */
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
/** The team's internal tools. */
const TEAM_ONLY = { linkToTeamWiki: false, linkToServicesPage: false };

export function registerConferenceAbilities() {
	// Everyone can see the conferences that are open for registration (or, from the assignment on,
	// for the waiting list) and their details - short of the members-only and team-only columns. Any
	// other conference is only visible to the people who have a part in it (the rules below).
	abilityBuilder.conference.allow('read').when(() => ({
		where: publicConference,
		columns: { ...MEMBERS_ONLY, ...TEAM_ONLY }
	}));
	abilityBuilder.conference.allow('read').when(systemAdmin);

	// Participants and supervisors also read the members-only columns.
	abilityBuilder.conference.allow('read').when((ctx) => {
		const participant = isParticipantOf(ctx);
		return participant ? { where: participant, columns: TEAM_ONLY } : undefined;
	});

	// The team reads all of it.
	abilityBuilder.conference.allow('read').when((ctx) => where(isTeamMemberOf(ctx)));

	// Update and delete are limited to the conference's own project management.
	abilityBuilder.conference
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOf(ctx, PROJECT_MANAGEMENT_ROLES)));
}

/**
 * Refuses unless the caller hands out document numbers in the conference (the postal page), which
 * is participant care's: the next number tells how many were handed out so far.
 */
export async function assertCanReadNextDocumentNumber(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}

/**
 * The arguments of `updateConference` that participant care and the content lead may send: links,
 * postal address, templates, the participants' announcement, the conference status and the
 * feature switches.
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
 * Refuses unless the caller may send these arguments to `updateConference`.
 *
 * Project management edits everything; participant care and the content lead may only touch the
 * links, the postal address, the templates, the announcement, the status and the features. The update ability is
 * project management's, so the link-only path checks the role itself and refuses any other
 * argument rather than ignoring it.
 */
export async function assertCanUpdateConference(ctx: ApiContext, args: ConferenceUpdateArgs) {
	const updateFilter = (await ctx.abilities.conference.filter('update')).merge({
		where: { id: args.id }
	});
	const mayEditAll = !!(await db.query.conference.findFirst({
		where: updateFilter.query.single.where,
		columns: { id: true }
	}));
	if (mayEditAll) return;

	await assertTeamPermission(ctx, args.id, 'editConferenceContent');
	const forbidden = Object.entries(args).filter(
		([key, value]) => value !== undefined && !CONFERENCE_CONTENT_ARGS.includes(key)
	);
	if (forbidden.length > 0) {
		throw apiError(
			'FORBIDDEN',
			m.conferenceChangeProjectManagementOnly({
				fields: forbidden.map(([key]) => key).join(', ')
			})
		);
	}
}

/** Refuses unless the caller uploaded every file `updateConference` is asked to store, for its field. */
export async function assertCanClaimConferenceFiles(ctx: ApiContext, args: ConferenceUpdateArgs) {
	const claim = (field: FileField<'conference'>, fileId: string | null | undefined) =>
		assertCanClaimFile(ctx, fileId, { kind: 'conference', field, conferenceId: args.id });
	await claim('image', args.imageFileId);
	await claim('emblem', args.emblemFileId);
	await claim('logo', args.logoFileId);
	await claim('contract', args.contractFileId);
	await claim('guardianConsent', args.guardianConsentFileId);
	await claim('mediaConsent', args.mediaConsentFileId);
	await claim('termsAndConditions', args.termsAndConditionsFileId);
	await claim('certificate', args.certificateFileId);
}

/** Placing the generated parts on the templates goes with the templates themselves. */
export async function assertCanSetDocumentLayout(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'editConferenceContent');
}

/** Refused when `updateConference` matched no row, as when the update ability matches none. */
export function conferenceUpdateRefused() {
	return apiError('FORBIDDEN', m.accessDeniedProjectManagement());
}

/** Creating a conference from a seeding document is for system admins. */
export function assertCanSeedConference(ctx: ApiContext) {
	if (!isSystemAdmin(ctx)) {
		throw apiError('FORBIDDEN', m.unauthorized({ error: 'User is not admin' }));
	}
}

/** The plausibility check is the conference's participant care's tool. */
export async function assertCanReadPlausibility(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}
