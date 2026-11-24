<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import PersonName from '../PersonName.svelte';
	import PersonNameButton from '../PersonNameButton.svelte';

	/** Who is in the person's delegation and in which committee each of them sits. */
	interface Props {
		delegationId: string;
		userId: string;
	}

	let { delegationId, userId }: Props = $props();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			members: {
				isHeadDelegate: true,
				user: { givenName: true, familyName: true },
				assignedCommittee: { abbreviation: true }
			}
		})
	);
	const members = $derived(
		delegation.members.toSorted((a, b) => a.user.familyName.localeCompare(b.user.familyName))
	);
</script>

<ul class="divide-base-300 flex flex-col divide-y" aria-label={m.delegationMembers()}>
	{#each members as member (member.id)}
		<li class="flex items-baseline justify-between gap-2 py-1">
			{#if member.user.id === userId}
				<span class="font-bold">
					<PersonName
						givenName={member.user.givenName}
						familyName={member.user.familyName}
						isHeadDelegate={member.isHeadDelegate}
					/>
				</span>
			{:else}
				<PersonNameButton user={member.user} isHeadDelegate={member.isHeadDelegate} />
			{/if}
			<span class="text-base-content/60">{member.assignedCommittee?.abbreviation ?? ''}</span>
		</li>
	{/each}
</ul>
