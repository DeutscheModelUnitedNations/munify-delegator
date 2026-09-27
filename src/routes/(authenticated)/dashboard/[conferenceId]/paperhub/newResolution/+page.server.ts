import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import { newResolutionSchema } from './form-schema';
import { client } from '$lib/api/rumbleClient/client';

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const [delegationMember] = await client.query.delegationMembers({
		__args: {
			where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } }
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

	return { form, delegationMember: delegationMember ?? null, conferenceId, userId: user.sub };
};
