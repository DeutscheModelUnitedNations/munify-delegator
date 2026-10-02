<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchConferencePaymentData } from '../conferencePaymentData';
	import { client } from '$lib/api/rumbleClient/client';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import ParticipantSelectionCard from '../ParticipantSelectionCard.svelte';
	import SelectableParticipantsFieldset from '../SelectableParticipantsFieldset.svelte';
	import SelectableParticipant from '../SelectableParticipant.svelte';
	import { PaymentParticipantSelection } from '../participantSelection.svelte';
	import Selection from '$lib/components/selection';
	import { sortByNames } from '$lib/helpers/formatNames';
	import { findOtherSupervisors } from './otherSupervisors';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const studentSelection = {
		id: true,
		supervisors: { id: true },
		user: { id: true, givenName: true, familyName: true }
	} as const;

	/**
	 * The conference's payment details; the caller's supervisor registration and the students a
	 * group payment can cover; and the supervisors sharing a participant with the caller, so a group
	 * payment can name the ones it covers. Not every supervisor of the conference: the caller may
	 * list those, but may only read the `user` of the ones they share a participant with, and a
	 * non-nullable `user` that comes back null fails the whole query.
	 *
	 * In one derived, so none of them waits on another.
	 */
	async function fetchGroupPayment(conferenceId: string) {
		const user = await getCurrentUser();
		const sharesAParticipant = { supervisors: { userId: { eq: user.sub } } };
		return Promise.all([
			user,
			fetchConferencePaymentData(conferenceId),
			client.liveQuery.conferenceSupervisors({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
				id: true,
				user: { id: true, givenName: true, familyName: true },
				supervisedDelegationMembers: studentSelection,
				supervisedSingleParticipants: studentSelection
			}),
			client.liveQuery.conferenceSupervisors({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						OR: [
							{ supervisedDelegationMembers: sharesAParticipant },
							{ supervisedSingleParticipants: sharesAParticipant }
						]
					}
				},
				id: true,
				user: { id: true, givenName: true, familyName: true },
				supervisedDelegationMembers: { id: true },
				supervisedSingleParticipants: { id: true }
			})
		]);
	}

	const [currentUser, conferencePaymentData, mySupervisorRegistrations, allOtherSupervisors] =
		$derived(await fetchGroupPayment(params.conferenceId));
	let supervisorData = $derived(mySupervisorRegistrations.at(0));
	let userData = $derived(supervisorData?.user);
	let delegationMembers = $derived(supervisorData?.supervisedDelegationMembers);
	let singleParticipants = $derived(supervisorData?.supervisedSingleParticipants);

	let otherSupervisors = $derived(findOtherSupervisors(supervisorData, allOtherSupervisors));

	const selection = new PaymentParticipantSelection(
		() => [
			...(delegationMembers ?? []).map((member) => member.user),
			...(singleParticipants ?? []).map((participant) => participant.user),
			...(userData ? [userData] : [])
		],
		() => !!supervisorData
	);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.groupPayment()}</h1>
	<p>{m.groupPaymentDescription()}</p>

	<ParticipantSelectionCard {selection}>
		<div class="flex flex-col gap-4 lg:flex-row">
			{#if delegationMembers && delegationMembers.length > 0}
				<SelectableParticipantsFieldset
					title={m.delegationMembers()}
					{selection}
					participants={delegationMembers}
				/>
			{/if}

			{#if singleParticipants && singleParticipants.length > 0}
				<SelectableParticipantsFieldset
					title={m.singleParticipants()}
					{selection}
					participants={singleParticipants}
				/>
			{/if}

			{#if userData}
				<Selection.Fieldset title={m.supervisors()}>
					<SelectableParticipant
						{selection}
						user={userData}
						label={m.myself({
							given_name: userData.givenName ?? '',
							family_name: userData.familyName ?? ''
						})}
					/>
					{#each otherSupervisors.sort( (a, b) => sortByNames(a, b) ) as supervisorUser (supervisorUser.id)}
						<SelectableParticipant {selection} user={supervisorUser} />
					{/each}
				</Selection.Fieldset>
			{/if}
		</div>
	</ParticipantSelectionCard>

	<ReferenceMaker
		users={selection.selected}
		ownUserId={currentUser.sub}
		{conferencePaymentData}
		onReferenceCreated={() => (selection.isReferenceCreated = true)}
	/>
</div>
