<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import Selection from '#lib/components/selection/index';
	import { sortByNames } from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import { fetchConferencePaymentData } from './conferencePaymentData';
	import { fetchPayablePeople } from './payablePeople';
	import { findOtherSupervisors } from './otherSupervisors';
	import {
		createPaymentParticipantSelection,
		type PayableUser
	} from './participantSelection.svelte';
	import ParticipantSelectionCard from './ParticipantSelectionCard.svelte';
	import SelectableParticipant from './SelectableParticipant.svelte';
	import SelectableParticipantsFieldset from './SelectableParticipantsFieldset.svelte';
	import ReferenceMaker from './ReferenceMaker.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const [people, conferencePaymentData] = $derived(
		await Promise.all([fetchPayablePeople(conferenceId), fetchConferencePaymentData(conferenceId)])
	);

	const me = $derived<PayableUser>({
		id: people.user.sub,
		givenName: people.user.given_name ?? null,
		familyName: people.user.family_name ?? null
	});
	const supervisor = $derived(people.mySupervisorRegistrations.at(0));
	// Somebody who has paid makes no new references at all; the API refuses them
	const iHavePaid = $derived(people.myStatuses.at(0)?.paymentStatus === 'DONE');
	// A supervisor who does not come to the conference pays no fee of their own
	const canPayForSelf = $derived(!supervisor || supervisor.plansOwnAttendenceAtConference);

	const delegationMembers = $derived(people.myMemberships.at(0)?.delegation.members ?? []);
	const supervisedDelegationMembers = $derived(supervisor?.supervisedDelegationMembers ?? []);
	const supervisedSingleParticipants = $derived(supervisor?.supervisedSingleParticipants ?? []);
	const otherSupervisors = $derived(
		findOtherSupervisors(supervisor, people.supervisorsSharingAStudent).toSorted(sortByNames)
	);

	const registrations = $derived([
		...delegationMembers,
		...supervisedDelegationMembers,
		...supervisedSingleParticipants
	]);
	// Shown in the picker, but no reference may cover them any more
	const paidUserIds = $derived(
		new Set(
			registrations
				.filter((registration) => registration.participant.paymentStatus === 'DONE')
				.map((registration) => registration.user.id)
		)
	);
	// the groups of the picker that have anybody in them
	const fieldsets = $derived(
		[
			{ key: 'delegation', title: m.delegationMembers(), participants: delegationMembers },
			{
				key: 'supervisedDelegations',
				title: m.delegationMembers(),
				participants: supervisedDelegationMembers
			},
			{
				key: 'supervisedSingles',
				title: m.singleParticipants(),
				participants: supervisedSingleParticipants
			}
		].filter((fieldset) => fieldset.participants.length > 0)
	);
	const others = $derived(registrations.map((registration) => registration.user));
	const everyone = $derived(
		[...(canPayForSelf ? [me] : []), ...others, ...otherSupervisors].filter(
			(user, index, all) =>
				!paidUserIds.has(user.id) && all.findIndex((x) => x.id === user.id) === index
		)
	);
	// Anybody besides the caller, paid or not: those who paid are listed too, greyed out, so the
	// picker says why they cannot be covered instead of hiding the option
	const canPayForOthers = $derived(
		[...others, ...otherSupervisors].some((user) => user.id !== me.id)
	);

	let payForOthersChosen = $state(false);
	const payForOthers = $derived(payForOthersChosen || !canPayForSelf);

	const selection = createPaymentParticipantSelection(() =>
		payForOthers ? everyone : canPayForSelf ? [me] : []
	);

	// Once a reference exists the selection is settled; only the transfer is left to show
	const showSelection = $derived(canPayForOthers && !selection.isReferenceCreated);

	function setPayForOthers(value: boolean) {
		payForOthersChosen = value;
		selection.selectAll();
	}
</script>

{#snippet alreadyPaid()}
	<div role="status" class="alert alert-success alert-soft max-w-2xl">
		<i class="fa-sharp-duotone fa-solid fa-circle-check text-2xl"></i>
		<div class="flex flex-col gap-1">
			<h2 class="font-bold">{m.paymentAlreadyPaidTitle()}</h2>
			<p>{m.paymentAlreadyPaidDescription()}</p>
		</div>
	</div>
{/snippet}

{#snippet supervisorsFieldset()}
	<Selection.Fieldset title={m.supervisors()}>
		{#if canPayForSelf}
			<SelectableParticipant
				{selection}
				user={me}
				label={m.myself({
					given_name: me.givenName ?? '',
					family_name: me.familyName ?? ''
				})}
			/>
		{/if}
		{#each otherSupervisors as supervisorUser (supervisorUser.id)}
			<SelectableParticipant {selection} user={supervisorUser} />
		{/each}
	</Selection.Fieldset>
{/snippet}

{#snippet participantPicker()}
	<ParticipantSelectionCard
		{selection}
		{payForOthers}
		{canPayForSelf}
		onPayForOthersChange={setPayForOthers}
	>
		{#if supervisor}
			{@render supervisorsFieldset()}
		{/if}
		{#each fieldsets as fieldset (fieldset.key)}
			<SelectableParticipantsFieldset
				title={fieldset.title}
				{selection}
				{paidUserIds}
				participants={fieldset.participants}
			/>
		{/each}
	</ParticipantSelectionCard>
{/snippet}

<div class="flex w-full flex-col gap-6">
	<BackToDashboard {conferenceId} />
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-bold">{m.payment()}</h1>
		{#if !selection.isReferenceCreated && !iHavePaid}
			<p class="max-w-4xl">{m.paymentDescription()}</p>
		{/if}
	</div>

	{#if iHavePaid}
		{@render alreadyPaid()}
	{:else}
		<div class="grid w-full items-start gap-6 {showSelection && 'xl:grid-cols-2'}">
			{#if showSelection}
				{@render participantPicker()}
			{/if}

			<ReferenceMaker
				users={selection.selected}
				ownUserId={me.id}
				{conferencePaymentData}
				onReferenceCreated={() => (selection.isReferenceCreated = true)}
			/>
		</div>
	{/if}
</div>
