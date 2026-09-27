import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import { newPaperSchema } from './form-schema';
import { client } from '$lib/api/rumbleClient/client';

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const [delegationMembers, conferenceAgendaItems] = await Promise.all([
		client.query.delegationMembers({
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
		}),
		client.query.committeeAgendaItems({
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

	return { form, delegationMember, conferenceAgendaItems, conferenceId, userId: user.sub };
};
