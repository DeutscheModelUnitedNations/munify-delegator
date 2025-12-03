<script lang="ts">
	import Selection from '$lib/components/Selection';
	import { m } from '$lib/paraglide/messages';
	import formatNames, { sortByNames } from '$lib/services/formatNames';
	import ReferenceMaker from '../ReferenceMaker.svelte';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let conferencePaymentDataQuery = $derived(data.PaymentLayoutQuery);
	let conferencePaymentData = $derived($conferencePaymentDataQuery.data?.findUniqueConference);
	let conferenceQueryData = $derived(data.conferenceQueryData);
	let delegationMembers = $derived(
		conferenceQueryData?.findUniqueDelegationMember?.delegation.members
	);

	type MinimalUserData = {
		id: string;
		given_name: string;
		family_name: string;
	};
	let selectedParticipants = $state<MinimalUserData[]>([]);

	const addParticipant = (user: { id: string; given_name: string; family_name: string }) => {
		if (!selectedParticipants.map((x) => x.id).includes(user.id)) {
			selectedParticipants = [...selectedParticipants, user];
		}
	};

	const removeParticipant = (user: MinimalUserData) => {
		selectedParticipants = selectedParticipants.filter((x) => x.id !== user.id);
	};

	const addOrRemoveParticipant = (user: MinimalUserData, selected: boolean) => {
		if (selected) {
			addParticipant(user);
		} else {
			removeParticipant(user);
		}
	};

	const addDefaultParticipants = () => {
		selectedParticipants = [...delegationMembers.map((member) => member.user)];
	};

	$effect(() => {
		if (delegationMembers) {
			addDefaultParticipants();
		}
	});
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.delegationPayment()}</h1>
	<p>{m.delegationPaymentDescription()}</p>

	<div class="bg-base-200 mt-4 flex w-full flex-col gap-2 rounded-lg p-4 shadow-lg">
		<h2 class="text-2xl font-bold">
			<i class="fa-duotone fa-list-check mr-4"></i>
			Teilnehmende auswählen
		</h2>

		<div class="join join-horizontal">
			<button class="btn btn-sm join-item" onclick={() => addDefaultParticipants()}>
				<i class="fa-duotone fa-check-double"></i>
				Alle auswählen
			</button>
			<button class="btn btn-sm join-item" onclick={() => (selectedParticipants = [])}>
				<i class="fa-duotone fa-xmark"></i>
				Alle abwählen
			</button>
		</div>

		<Selection.Fieldset title={m.delegationMembers()}>
			{#each delegationMembers.sort((a, b) => sortByNames(a.user, b.user)) as member}
				<Selection.Item
					label={formatNames(member.user.given_name, member.user.family_name)}
					selected={selectedParticipants.map((x) => x.id).includes(member.user.id)}
					changeSelection={(selected) => addOrRemoveParticipant(member.user, selected)}
				/>
			{/each}
		</Selection.Fieldset>

		<div class="alert alert-info mt-4">
			<i class="fa-solid fa-info-circle mr-2 text-2xl"></i>
			<div>
				<h3 class="font-bold">Teilnehmende sind nicht aufgeführt?</h3>
				<p>
					Wenn du Beiträge für Teilnehmende überweisen willst, die nicht oben in den Listen
					aufgeführt sind, setze dich bitte vor Tätigung der Überweisung mit der
					Teilnehmendenbetreuung in Verbindung und sprich eine individuelle Lösung ab.
				</p>
			</div>
		</div>
	</div>

	<ReferenceMaker users={selectedParticipants} ownUserId={data.user.sub} {conferencePaymentData} />
</div>
