import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$houdini';
import { newPaperSchema } from './form-schema';
import { graphql } from '$houdini';

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
import { error } from '@sveltejs/kit';

const query = graphql(`
	query getPaperParticipantDelegationMemberQuery($conferenceId: String!, $userId: String!) {
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

		findManyAgendaItems(where: { committee: { conferenceId: { equals: $conferenceId } } }) {
			id
			title
			committee {
				abbreviation
			}
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const getPaperDelegationMemberQuery = await query.fetch({
		event,
		variables: {
			conferenceId,
			userId: user.sub
		}
	});

	const committee =
		getPaperDelegationMemberQuery?.data?.findUniqueDelegationMember?.assignedCommittee;
	const delegation = getPaperDelegationMemberQuery?.data?.findUniqueDelegationMember?.delegation;

	if (!delegation) {
		error(400, 'Delegation member does not exist');
	}

	const typeParam = event.url.searchParams.get('type');
	const validTypes = ['POSITION_PAPER', 'INTRODUCTION_PAPER'] as const;
	const type =
		typeParam && validTypes.includes(typeParam as (typeof validTypes)[number])
			? (typeParam as (typeof validTypes)[number])
			: 'POSITION_PAPER';

	const form = await superValidate(
		{
			delegation: delegation?.assignedNation
				? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation?.alpha3Code)
				: delegation.assignedNonStateActor
					? delegation.assignedNonStateActor.name
					: '',
			committee: committee?.name,
			type
		},
		zod4(newPaperSchema)
	);

	return { form, getPaperDelegationMemberQuery, conferenceId, userId: user.id };
};
