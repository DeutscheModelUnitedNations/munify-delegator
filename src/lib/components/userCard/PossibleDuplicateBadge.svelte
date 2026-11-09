<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';

	/**
	 * Says so when the account may belong to the same person as another one, or has been confirmed
	 * to, and leads to the plausibility page where the pairs are decided. Only readers who may see the pairs (the care
	 * team) get any; for everyone else the lists come back empty.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const names = { givenName: true, familyName: true } as const;
	const user = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			id: true,
			duplicatesAsUser: { status: true, candidate: names },
			duplicatesAsCandidate: { status: true, user: names }
		})
	);
	const pairs = $derived([
		...user.duplicatesAsUser.map((pair) => ({ status: pair.status, other: pair.candidate })),
		...user.duplicatesAsCandidate.map((pair) => ({ status: pair.status, other: pair.user }))
	]);
	const hasOpen = $derived(pairs.some((pair) => pair.status === 'OPEN'));
	// Confirmed pairs are transitive (`sameLinks.ts`): these are all the person's other accounts.
	const confirmedNames = $derived(
		pairs
			.filter((pair) => pair.status === 'CONFIRMED')
			.map((pair) =>
				formatNames({ givenName: pair.other.givenName, familyName: pair.other.familyName })
			)
	);
	const plausibility = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/plausibility', { conferenceId })
	);
</script>

{#if confirmedNames.length > 0}
	<a
		class="badge badge-error gap-1"
		href={plausibility}
		title={m.userConfirmedDuplicateOf({ names: confirmedNames.join(', ') })}
	>
		<i aria-hidden="true" class="ph-duotone ph-link"></i>
		{m.userHasConfirmedDuplicate()}
		{#if confirmedNames.length > 1}
			<span class="font-bold">×{confirmedNames.length}</span>
		{/if}
	</a>
{/if}
{#if hasOpen}
	<a class="badge badge-warning gap-1" href={plausibility}>
		<i aria-hidden="true" class="ph-duotone ph-users"></i>
		{m.userHasPossibleDuplicate()}
	</a>
{/if}
