<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import SchoolChangeForm from '#lib/components/form/SchoolChangeForm.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * The person's own school in the conference (`conferenceParticipant.school`): what the seats and
	 * numbers per school count, and what stays theirs when the assignment merges delegations of
	 * several schools. Participant care corrects it here.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			id: true,
			school: { id: true, name: true, city: true }
		})
	);
	// No row yet: the person has no part in the conference to give a school to
	const participant = $derived(participants.at(0));
	const participantId = $derived(participant?.id);
	const school = $derived(participant?.school);

	let changing = $state(false);

	const save = (id: string, choice: { schoolId?: string | null; schoolName?: string | null }) =>
		Promise.resolve(client.mutate.setParticipantSchool({ __args: { id, ...choice }, id: true }));
</script>

{#if participantId}
	{@render section(participantId)}
{/if}

{#snippet section(id: string)}
	<div class="card flex flex-col gap-2 p-4">
		<h3 class="font-bold">
			<i class="fa-sharp-duotone fa-solid fa-school mr-2"></i>
			{m.participantSchool()}
		</h3>
		<p class="text-base-content/70 text-sm">{m.participantSchoolHint()}</p>
		<div class="flex flex-wrap items-center gap-2">
			{#if school}
				<span>{school.name}</span>
				{#if school.city}
					<span class="text-base-content/60 text-sm">{school.city}</span>
				{/if}
			{:else}
				<span class="text-base-content/60 italic">{m.schoolPickerNone()}</span>
			{/if}
			<button class="btn btn-ghost btn-sm" onclick={() => (changing = true)}>
				<i class="fa-sharp-duotone fa-solid fa-pen"></i>
				{m.changeSchool()}
			</button>
		</div>
	</div>

	<Modal bind:open={changing} title={m.changeSchool()}>
		<SchoolChangeForm
			current={school}
			label={m.schoolOrInstitution()}
			save={(choice) => save(id, choice)}
			onSaved={() => (changing = false)}
		/>
	</Modal>
{/snippet}
