import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { error } from '@sveltejs/kit';
import { client } from '$lib/api/rumbleClient/client';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { newPaperSchema } from './form-schema';

const VALID_TYPES = ['POSITION_PAPER', 'INTRODUCTION_PAPER'] as const;

/**
 * The delegation writing the paper, the agenda items it can be filed against, and the form seeded
 * with both. `defaults` rather than `superValidate`: the paper is created by a GraphQL mutation in
 * SPA mode, so there is no action to validate against.
 */
export async function fetchNewPaperContext(
	conferenceId: string,
	userId: string,
	typeParam: string | null
) {
	const [delegationMembers, conferenceAgendaItems] = await Promise.all([
		client.liveQuery.delegationMembers({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } }
			},
			id: true,
			user: { id: true },
			assignedCommittee: {
				id: true,
				name: true,
				abbreviation: true,
				resolutionHeadline: true,
				agendaItems: { id: true, title: true }
			},
			delegation: {
				id: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: {
					id: true,
					abbreviation: true,
					name: true,
					fontAwesomeIcon: true
				}
			}
		}),
		client.liveQuery.committeeAgendaItems({
			__args: { where: { committee: { conferenceId: { eq: conferenceId } } } },
			id: true,
			title: true,
			committee: { abbreviation: true }
		})
	]);

	const delegationMember = delegationMembers.at(0) ?? null;
	const committee = delegationMember?.assignedCommittee;
	const delegation = delegationMember?.delegation;

	if (!delegation) {
		error(400, 'Delegation member does not exist');
	}

	const type = VALID_TYPES.find((valid) => valid === typeParam) ?? 'POSITION_PAPER';

	const form = defaults(
		{
			delegation: delegation.assignedNation
				? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
				: (delegation.assignedNonStateActor?.name ?? ''),
			committee: committee?.name,
			type
		},
		zod4(newPaperSchema)
	);

	return { form, delegationMember, conferenceAgendaItems };
}
