<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import SchoolChangeForm from '#lib/components/form/SchoolChangeForm.svelte';
	import { m } from '#lib/paraglide/messages';
	import Fact from '../Fact.svelte';

	/**
	 * The person's own school in the conference (`conferenceParticipant.school`), the only school a
	 * person taking part has: what the seats and numbers per school count, and what stays theirs
	 * when the assignment merges delegations of several schools. Participant care corrects it here,
	 * and opens the school's page from it: only participant care reads the row, the same roles the
	 * schools pages want.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			school: { id: true, name: true, city: true }
		})
	);
	const participant = $derived(participants.at(0));
	const participantId = $derived(participant?.id);
	const school = $derived(participant?.school);
	const city = $derived(
		school?.city && !school.name.includes(school.city) ? school.city : undefined
	);

	let changing = $state(false);
</script>

<Fact label={m.school()} icon="graduation-cap" class="col-span-2">
	<span class="flex items-start justify-between gap-2">
		{#if school}
			<a
				class="link link-hover"
				href={resolve(`dashboard/${conferenceId}/team/schools/${school.id}`)}
			>
				{[school.name, city].filter(Boolean).join(', ')}
			</a>
		{:else}
			<span class="text-base-content/60">{m.noSchoolGiven()}</span>
		{/if}
		{#if participantId}
			<button
				class="btn btn-ghost btn-xs btn-square -my-1 text-base"
				aria-label={m.changeSchool()}
				title={m.changeSchool()}
				onclick={() => (changing = true)}
			>
				<i aria-hidden="true" class="ph-duotone ph-pencil-simple"></i>
			</button>
		{/if}
	</span>
	{#if participantId}
		{@const id = participantId}
		<Modal bind:open={changing} title={m.changeSchool()}>
			<SchoolChangeForm
				current={school}
				label={m.schoolOrInstitution()}
				save={(choice) =>
					Promise.resolve(
						client.mutate.setParticipantSchool({
							__args: { conferenceId, id, ...choice },
							id: true
						})
					)}
				onSaved={() => (changing = false)}
			/>
		</Modal>
	{/if}
</Fact>
