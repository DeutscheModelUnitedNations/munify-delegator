<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import { type PageData } from './$houdini';
	import Selection from '$lib/components/Selection';
	import formatNames, { sortByNames } from '$lib/services/formatNames';
	import toast from 'svelte-french-toast';

	type MinimalUserData = {
		id: string;
		given_name: string;
		family_name: string;
	};

	let { data }: { data: PageData } = $props();
	let conferencePaymentDataQuery = $derived(data.PaymentLayoutQuery);
	let conferencePaymentData = $derived($conferencePaymentDataQuery.data?.findUniqueConference);
	let conferenceQueryData = $derived(data.conferenceQueryData);
	let conferencePaymentGroupData = $derived(data.PaymentGroupQuery);
	let supervisorData = $derived(conferenceQueryData.findUniqueConferenceSupervisor);
	let userData = $derived(supervisorData?.user);
	let delegationMembers = $derived(supervisorData?.supervisedDelegationMembers);
	let singleParticipants = $derived(supervisorData?.supervisedSingleParticipants);
	let allOtherSupervisors = $derived(
		$conferencePaymentGroupData.data?.findManyConferenceSupervisors
	);
	let otherSupervisors = $derived.by(() => {
		if (!delegationMembers || !singleParticipants || !allOtherSupervisors || !userData) {
			return [];
		}
		let presentSupervisorIds = new Set<string>([
			...delegationMembers.map((member) => member.supervisors.map((sup) => sup.id)).flat(),
			...singleParticipants
				.map((participant) => participant.supervisors.map((sup) => sup.id))
				.flat()
		]);

		let supervisors: MinimalUserData[] = [];

		presentSupervisorIds.forEach((id) => {
			let supervisor = allOtherSupervisors.find((sup) => sup.id === id);
			if (supervisor && supervisor.user.id !== userData.id) {
				supervisors.push(supervisor.user);
			}
		});

		return supervisors;
	});

	let selectedParticipants = $state<MinimalUserData[]>([]);
	let isReferenceCreated = $state(false);
	let isInitialized = $state(false);

	const addParticipant = (user: { id: string; given_name: string; family_name: string }) => {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
			return;
		}

		if (!selectedParticipants.map((x) => x.id).includes(user.id)) {
			selectedParticipants = [...selectedParticipants, user];
		}
	};

	const removeParticipant = (user: MinimalUserData) => {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
			return;
		}

		selectedParticipants = selectedParticipants.filter((x) => x.id !== user.id);
	};

	const addOrRemoveParticipant = (user: MinimalUserData, selected: boolean) => {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
			return;
		}

		if (selected) {
			addParticipant(user);
		} else {
			removeParticipant(user);
		}
	};

	const addDefaultParticipants = () => {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
			return;
		}

		selectedParticipants = [
			...(delegationMembers ?? []).map((member) => member.user),
			...(singleParticipants ?? []).map((participant) => participant.user),
			userData
		];
	};

	const removeAllParticipants = () => {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
			return;
		}

		selectedParticipants = [];
	};

	$effect(() => {
		if (supervisorData && !isInitialized) {
			addDefaultParticipants();
			isInitialized = true;
		}
	});
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.groupPayment()}</h1>
	<p>{m.groupPaymentDescription()}</p>

	<div class="bg-base-200 mt-4 flex w-full flex-col gap-2 rounded-lg p-4 shadow-lg">
		<h2 class="text-2xl font-bold">
			<i class="fa-duotone fa-list-check mr-4"></i>
			{m.selectParticipants()}
		</h2>

		<div class="join join-horizontal">
			<button
				class="btn btn-sm join-item"
				onclick={addDefaultParticipants}
				disabled={isReferenceCreated}
			>
				<i class="fa-duotone fa-check-double"></i>
				{m.selectAll()}
			</button>
			<button
				class="btn btn-sm join-item"
				onclick={removeAllParticipants}
				disabled={isReferenceCreated}
			>
				<i class="fa-duotone fa-xmark"></i>
				{m.deselectAll()}
			</button>
		</div>

		<div class="flex flex-col gap-4 lg:flex-row">
			{#if delegationMembers && delegationMembers.length > 0}
				<Selection.Fieldset title={m.delegationMembers()}>
					{#each delegationMembers.sort((a, b) => sortByNames(a.user, b.user)) as member}
						<Selection.Item
							label={formatNames(member.user.given_name, member.user.family_name)}
							selected={selectedParticipants.map((x) => x.id).includes(member.user.id)}
							changeSelection={(selected) => addOrRemoveParticipant(member.user, selected)}
							disabled={isReferenceCreated}
						/>
					{/each}
				</Selection.Fieldset>
			{/if}

			{#if singleParticipants && singleParticipants.length > 0}
				<Selection.Fieldset title={m.singleParticipants()}>
					{#each singleParticipants.sort((a, b) => sortByNames(a.user, b.user)) as participant}
						<Selection.Item
							label={formatNames(participant.user.given_name, participant.user.family_name)}
							selected={selectedParticipants.map((x) => x.id).includes(participant.user.id)}
							changeSelection={(selected) => addOrRemoveParticipant(participant.user, selected)}
							disabled={isReferenceCreated}
						/>
					{/each}
				</Selection.Fieldset>
			{/if}

			{#if userData}
				<Selection.Fieldset title={m.supervisors()}>
					<Selection.Item
						label={m.myself({
							given_name: userData.given_name,
							family_name: userData.family_name
						})}
						selected={selectedParticipants.map((x) => x.id).includes(userData.id)}
						changeSelection={(selected) => addOrRemoveParticipant(userData, selected)}
						disabled={isReferenceCreated}
					/>
					{#each otherSupervisors.sort((a, b) => sortByNames(a, b)) as supervisorUser}
						<Selection.Item
							label={formatNames(supervisorUser.given_name, supervisorUser.family_name)}
							selected={selectedParticipants.map((x) => x.id).includes(supervisorUser.id)}
							changeSelection={(selected) => addOrRemoveParticipant(supervisorUser, selected)}
							disabled={isReferenceCreated}
						/>
					{/each}
				</Selection.Fieldset>
			{/if}
		</div>

		<div class="alert alert-info mt-4">
			<i class="fa-solid fa-info-circle mr-2 text-2xl"></i>
			<div>
				<h3 class="font-bold">{m.participantsNotFoundTitle()}</h3>
				<p>
					{m.participantsNotFoundDescription()}
				</p>
			</div>
		</div>
	</div>

	<ReferenceMaker
		users={selectedParticipants}
		ownUserId={data.user.sub}
		{conferencePaymentData}
		bind:isReferenceCreated
	/>
</div>
