import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$houdini';
import { newResolutionSchema } from './form-schema';
import { graphql } from '$houdini';

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
import { error } from '@sveltejs/kit';

const query = graphql(`
	query getResolutionParticipantDelegationMemberQuery($conferenceId: String!, $userId: String!) {
		findUniqueDelegationMember(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			user {
				id
			}
			assignedCommittee {
				id
				name
				abbreviation
				resolutionHeadline
				agendaItems {
					id
					title
				}
			}
			delegation {
				id
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					abbreviation
					name
					fontAwesomeIcon
				}
			}
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const getResolutionDelegationMemberQuery = await query.fetch({
		event,
		variables: {
			conferenceId,
			userId: user.sub
		}
	});

	const committee =
		getResolutionDelegationMemberQuery?.data?.findUniqueDelegationMember?.assignedCommittee;
	const delegation =
		getResolutionDelegationMemberQuery?.data?.findUniqueDelegationMember?.delegation;

	if (!delegation) {
		error(400, 'Delegation member does not exist');
	}

	const form = await superValidate(
		{
			delegation: delegation?.assignedNation
				? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation?.alpha3Code)
				: delegation.assignedNonStateActor
					? delegation.assignedNonStateActor.name
					: '',
			committee: committee?.name
		},
		zod4(newResolutionSchema)
	);

	return { form, getResolutionDelegationMemberQuery, conferenceId, userId: user.id };
};
