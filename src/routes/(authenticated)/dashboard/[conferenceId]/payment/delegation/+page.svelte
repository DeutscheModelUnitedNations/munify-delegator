<script lang="ts">
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchConferencePaymentData } from '../conferencePaymentData';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import ParticipantSelectionCard from '../ParticipantSelectionCard.svelte';
	import SelectableParticipantsFieldset from '../SelectableParticipantsFieldset.svelte';
	import { PaymentParticipantSelection } from '../participantSelection.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	/**
	 * The conference's payment details and the caller's membership, for the delegation a payment can
	 * cover - in one derived, so neither waits on the other.
	 */
	async function fetchDelegationPayment(conferenceId: string) {
		const user = await getCurrentUser();
		return Promise.all([
			user,
			fetchConferencePaymentData(conferenceId),
			client.liveQuery.delegationMembers({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
				delegation: {
					members: { id: true, user: { id: true, givenName: true, familyName: true } }
				}
			})
		]);
	}

	const [currentUser, conferencePaymentData, myMemberships] = $derived(
		await fetchDelegationPayment(params.conferenceId)
	);
	let delegationMembers = $derived(myMemberships.at(0)?.delegation.members);

	const selection = new PaymentParticipantSelection(
		() => delegationMembers?.map((member) => member.user),
		() => !!delegationMembers
	);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.delegationPayment()}</h1>
	<p>{m.delegationPaymentDescription()}</p>

	<ParticipantSelectionCard {selection}>
		{#if delegationMembers}
			<SelectableParticipantsFieldset
				title={m.delegationMembers()}
				{selection}
				participants={delegationMembers}
			/>
		{/if}
	</ParticipantSelectionCard>

	<ReferenceMaker
		users={selection.selected}
		ownUserId={currentUser.sub}
		{conferencePaymentData}
		onReferenceCreated={() => (selection.isReferenceCreated = true)}
	/>
</div>
