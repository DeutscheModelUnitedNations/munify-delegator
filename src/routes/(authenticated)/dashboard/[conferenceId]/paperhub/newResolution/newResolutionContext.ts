import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { error } from '@sveltejs/kit';
import { client } from '$lib/api/rumbleClient/client';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { newResolutionSchema } from './form-schema';

/**
 * The delegation writing the resolution and the form seeded with its name and committee.
 * `defaults` rather than `superValidate`: the resolution is created by a GraphQL mutation in SPA
 * mode, so there is no action to validate against.
 */
export async function fetchNewResolutionContext(conferenceId: string, userId: string) {
	const [delegationMember] = await client.liveQuery.delegationMembers({
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
	});

	const committee = delegationMember?.assignedCommittee;
	const delegation = delegationMember?.delegation;

	if (!delegation) {
		error(400, 'Delegation member does not exist');
	}

	const form = defaults(
		{
			delegation: delegation.assignedNation
				? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
				: (delegation.assignedNonStateActor?.name ?? ''),
			committee: committee?.name
		},
		zod4(newResolutionSchema)
	);

	return { form, delegationMember: delegationMember ?? null };
}
