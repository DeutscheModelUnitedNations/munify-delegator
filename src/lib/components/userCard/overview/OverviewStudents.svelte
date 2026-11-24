<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import PersonNameButton from '../PersonNameButton.svelte';

	/** Whom the person supervises. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const name = { givenName: true, familyName: true } as const;
	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			supervisedDelegationMembers: { user: name },
			supervisedSingleParticipants: { user: name }
		})
	);
	const students = $derived(
		[...supervisor.supervisedDelegationMembers, ...supervisor.supervisedSingleParticipants]
			.map(({ id, user }) => ({ id, user }))
			.toSorted((a, b) => a.user.familyName.localeCompare(b.user.familyName))
	);
</script>

{#if students.length === 0}
	<p class="text-base-content/60 italic">{m.userCardNoStudents()}</p>
{:else}
	<ul class="flex max-h-56 flex-col gap-1 overflow-y-auto">
		{#each students as student (student.id)}
			<li><PersonNameButton user={student.user} /></li>
		{/each}
	</ul>
{/if}
