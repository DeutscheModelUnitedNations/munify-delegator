<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Says so when the account may belong to the same person as another one, and leads to the
	 * plausibility page where the pair is decided. Only readers who may see the pairs (the care
	 * team) get any; for everyone else the lists come back empty.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// Open or confirmed pairs. The GraphQL `where` takes a single enum value per field, not `in`.
	const standing = { NOT: { status: 'DISMISSED' as const } };
	const user = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			id: true,
			duplicatesAsUser: { __args: { where: standing }, id: true },
			duplicatesAsCandidate: { __args: { where: standing }, id: true }
		})
	);
	const hasDuplicate = $derived(
		user.duplicatesAsUser.length + user.duplicatesAsCandidate.length > 0
	);
</script>

{#if hasDuplicate}
	<a
		class="badge badge-warning gap-1"
		href={resolve('/(authenticated)/dashboard/[conferenceId]/management/plausibility', {
			conferenceId
		})}
	>
		<i class="fa-sharp-duotone fa-solid fa-user-group"></i>
		{m.userHasPossibleDuplicate()}
	</a>
{/if}
