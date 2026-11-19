import { m } from '#lib/paraglide/messages';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import {
	audienceKey,
	coveringAudience,
	TEAM_ROLES,
	type Audience
} from '#lib/helpers/announcements';
import {
	audienceKindLabel,
	audienceLabel,
	SIMPLE_AUDIENCES,
	type AudienceLookups
} from './announcementLabels';

/** One block the editor's audience search offers. */
export interface AudienceOption {
	key: string;
	audience: Audience;
	/** Its name within its section: "SR · Security Council", not "Committee: SR · …". */
	label: string;
	/** Picked already: choosing it again takes it out. */
	picked: boolean;
	/** The picked block already holding all of its people; it cannot be added then. */
	coveredBy: string | null;
}

/** The offered blocks of one kind, under the section's heading. */
export interface AudienceSection {
	key: 'groups' | 'committees' | 'roles' | 'surveyOptions' | 'team';
	label: string;
	options: AudienceOption[];
}

/**
 * What the audience search offers: every block by section, each saying whether it is picked and
 * which picked block already covers it. Empty sections are left out.
 */
export function audienceSections({
	lookups,
	picked
}: {
	lookups: AudienceLookups;
	picked: readonly Audience[];
}): AudienceSection[] {
	const taken = new Set(picked.map(audienceKey));
	const option = (audience: Audience, label: string): AudienceOption => {
		const key = audienceKey(audience);
		const covering = coveringAudience({ audience, audiences: picked });
		return {
			key,
			audience,
			label,
			picked: taken.has(key),
			coveredBy: covering ? audienceLabel({ audience: covering, lookups }) : null
		};
	};
	const named = (entries: ReadonlyMap<string, string>, build: (id: string) => Audience) =>
		[...entries].map(([id, label]) => option(build(id), label));

	const sections: AudienceSection[] = [
		{
			key: 'groups',
			label: m.announcementAudienceGroups(),
			options: SIMPLE_AUDIENCES.map((kind) => option({ kind }, audienceKindLabel(kind)))
		},
		{
			key: 'committees',
			label: m.announcementAudienceCommittees(),
			options: named(lookups.committees, (committeeId) => ({ kind: 'COMMITTEE', committeeId }))
		},
		{
			key: 'roles',
			label: m.announcementAudienceRoles(),
			options: named(lookups.roles, (roleId) => ({ kind: 'ROLE', roleId }))
		},
		{
			key: 'surveyOptions',
			label: m.announcementAudienceSurveyOptions(),
			options: named(lookups.surveyOptions, (surveyOptionId) => ({
				kind: 'SURVEY_OPTION',
				surveyOptionId
			}))
		},
		{
			key: 'team',
			label: m.announcementAudienceTeam(),
			options: [
				option({ kind: 'TEAM', teamRole: null }, m.announcementAudienceWholeTeam()),
				...TEAM_ROLES.map((teamRole) =>
					option({ kind: 'TEAM', teamRole }, translateTeamRole(teamRole))
				)
			]
		}
	];
	return sections.filter((section) => section.options.length > 0);
}

const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * The sections with only the blocks every word of `search` is found in, its own name or its
 * section's: "sicherheit" finds the Security Council, "gremien" every committee.
 */
export function searchAudienceSections({
	sections,
	search
}: {
	sections: readonly AudienceSection[];
	search: string;
}): AudienceSection[] {
	const words = normalize(search).split(/\s+/).filter(Boolean);
	if (words.length === 0) return [...sections];
	return sections
		.map((section) => ({
			...section,
			options: section.options.filter((entry) => {
				const haystack = normalize(`${section.label} ${entry.label}`);
				return words.every((word) => haystack.includes(word));
			})
		}))
		.filter((section) => section.options.length > 0);
}

/** Whether choosing the option does anything: add it, or take a picked one out. */
export const canChoose = (option: AudienceOption) => option.picked || !option.coveredBy;

/** The blocks most announcements go to, offered at once while nothing is picked. */
export const SUGGESTED_AUDIENCES: readonly Audience[] = [
	{ kind: 'EVERYONE' },
	{ kind: 'SEATED' },
	{ kind: 'SUPERVISORS' },
	{ kind: 'PAYMENT_OPEN' },
	{ kind: 'TEAM', teamRole: null }
];
