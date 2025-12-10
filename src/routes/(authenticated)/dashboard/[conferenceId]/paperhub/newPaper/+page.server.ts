import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$houdini';
import { newPaperSchema } from './form-schema';
import { graphql, PaperType } from '$houdini';
import { PaperType as PaperTypePrisma } from '@prisma/client';

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

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

	const typeParam = event.url.searchParams.get('type');
	const type =
		typeParam && typeParam in PaperType ? (typeParam as PaperTypePrisma) : 'POSITION_PAPER';

	const form = await superValidate(
		{
			delegation: delegation.assignedNation
				? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
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
