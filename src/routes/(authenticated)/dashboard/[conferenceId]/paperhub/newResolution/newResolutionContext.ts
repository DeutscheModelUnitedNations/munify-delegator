import { defaults } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { error } from '@sveltejs/kit';
import { client } from '$lib/api/rumbleClient/client';
import { paperEntityName } from '../paperDisplay';
import { newResolutionSchema } from './form-schema';

/**
 * The delegation writing the resolution, the conference its header names, and the form seeded
 * with the delegation's name and committee.
 * `defaults` rather than `superValidate`: the resolution is created by a GraphQL mutation in SPA
 * mode, so there is no action to validate against.
 */
export async function fetchNewResolutionContext(conferenceId: string, userId: string) {
	const [delegationMembers, conference] = await Promise.all([
		client.liveQuery.delegationMembers({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } }
			},
			id: true,
			assignedCommittee: {
				id: true,
				name: true,
				abbreviation: true,
				resolutionHeadline: true,
				agendaItems: { id: true, title: true }
			},
			delegation: {
				id: true,
				assignedNation: { alpha3Code: true },
				assignedNonStateActor: { id: true, name: true }
			}
		}),
		// What the resolution header prints about the conference
		client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			longTitle: true,
			emblemDataURL: true
		})
	]);

	const delegationMember = delegationMembers.at(0);
	if (!delegationMember) {
		error(400, 'Delegation member does not exist');
	}

	const form = defaults(
		{
			delegation: paperEntityName(delegationMember.delegation) ?? '',
			committee: delegationMember.assignedCommittee?.name
		},
		zod4(newResolutionSchema)
	);

	return { form, delegationMember, conference };
}
