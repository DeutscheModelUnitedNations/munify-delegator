import { m } from '#lib/paraglide/messages';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type { AnnouncementState, Audience, AudienceKind } from '#lib/helpers/announcements';

/** What the editor and the list call the audiences, states and importances. */

/** The audiences that name nothing further, in the order the picker offers them. */
export const SIMPLE_AUDIENCES = [
	'EVERYONE',
	'DELEGATES',
	'SINGLE_PARTICIPANTS',
	'SUPERVISORS',
	'APPLICANTS',
	'SEATED',
	'WAITING_LIST',
	'PAYMENT_OPEN',
	'PAPERWORK_OPEN',
	'MINORS',
	'ADULTS'
] as const satisfies readonly AudienceKind[];

const KIND_LABEL: Record<AudienceKind, () => string> = {
	EVERYONE: () => m.announcementAudienceEveryone(),
	DELEGATES: () => m.announcementAudienceDelegates(),
	SINGLE_PARTICIPANTS: () => m.announcementAudienceSingleParticipants(),
	SUPERVISORS: () => m.announcementAudienceSupervisors(),
	APPLICANTS: () => m.announcementAudienceApplicants(),
	SEATED: () => m.announcementAudienceSeated(),
	WAITING_LIST: () => m.announcementAudienceWaitingList(),
	TEAM: () => m.announcementAudienceTeam(),
	COMMITTEE: () => m.announcementAudienceCommittee(),
	ROLE: () => m.announcementAudienceRole(),
	SURVEY_OPTION: () => m.announcementAudienceSurveyOption(),
	PAYMENT_OPEN: () => m.announcementAudiencePaymentOpen(),
	PAPERWORK_OPEN: () => m.announcementAudiencePaperworkOpen(),
	MINORS: () => m.announcementAudienceMinors(),
	ADULTS: () => m.announcementAudienceAdults()
};

export const audienceKindLabel = (kind: AudienceKind) => KIND_LABEL[kind]();

/** A role as the team names it: the nation in the reader's language, or the role's own name. */
export function roleLabel(role: { name?: string | null; nationAlpha3Code?: string | null }) {
	return role.nationAlpha3Code
		? getFullTranslatedCountryNameFromISO3Code(role.nationAlpha3Code)
		: (role.name ?? '');
}

/** What the audiences' ids stand for. */
export interface AudienceLookups {
	committees: ReadonlyMap<string, string>;
	roles: ReadonlyMap<string, string>;
	surveyOptions: ReadonlyMap<string, string>;
}

/** One block as a chip: "Committee: GA", "Team: Participant care", "Supervisors". */
export function audienceLabel({
	audience,
	lookups
}: {
	audience: Audience;
	lookups: AudienceLookups;
}) {
	const kind = audienceKindLabel(audience.kind);
	const named = (name: string | undefined) => `${kind}: ${name ?? m.announcementAudienceGone()}`;
	switch (audience.kind) {
		case 'COMMITTEE':
			return named(lookups.committees.get(audience.committeeId ?? ''));
		case 'ROLE':
			return named(lookups.roles.get(audience.roleId ?? ''));
		case 'SURVEY_OPTION':
			return named(lookups.surveyOptions.get(audience.surveyOptionId ?? ''));
		case 'TEAM':
			return audience.teamRole ? `${kind}: ${translateTeamRole(audience.teamRole)}` : kind;
		default:
			return kind;
	}
}

/** A state's name, its badge, its icon and the bar along its row's edge in the team's list. */
export const STATE_LOOK: Record<
	AnnouncementState,
	{ label: () => string; badge: string; edge: string; icon: string }
> = {
	DRAFT: {
		label: () => m.announcementStateDraft(),
		icon: 'ph-pencil-simple-line',
		badge: 'badge-ghost',
		edge: 'border-base-content/20'
	},
	SCHEDULED: {
		label: () => m.announcementStateScheduled(),
		icon: 'ph-clock',
		badge: 'badge-info badge-soft',
		edge: 'border-info'
	},
	PUBLISHED: {
		label: () => m.announcementStatePublished(),
		icon: 'ph-broadcast',
		badge: 'badge-success badge-soft',
		edge: 'border-success'
	},
	EXPIRED: {
		label: () => m.announcementStateExpired(),
		icon: 'ph-hourglass-low',
		badge: 'badge-warning badge-soft',
		edge: 'border-warning'
	},
	ARCHIVED: {
		label: () => m.announcementStateArchived(),
		icon: 'ph-archive',
		badge: 'badge-ghost',
		edge: 'border-transparent'
	}
};

/** The states in the order an announcement passes through them. */
export const STATE_ORDER: readonly AnnouncementState[] = [
	'DRAFT',
	'SCHEDULED',
	'PUBLISHED',
	'EXPIRED',
	'ARCHIVED'
];

/** Narrows the API's `state` string to the states the page knows. */
export function isAnnouncementState(state: string): state is AnnouncementState {
	return Object.hasOwn(STATE_LOOK, state);
}
