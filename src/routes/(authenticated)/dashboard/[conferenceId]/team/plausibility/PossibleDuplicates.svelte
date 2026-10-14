<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import DuplicateComparison from './DuplicateComparison.svelte';
	import { duplicatesOfConference } from './possibleDuplicatesWhere';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const account = {
		givenName: true,
		familyName: true,
		birthday: true,
		email: true,
		createdAt: true,
		globalNotes: true,
		phone: true,
		emergencyContacts: true,
		street: true,
		zip: true,
		city: true
	} as const;
	const attendance = {
		conferenceId: true,
		title: true,
		startConference: true,
		role: true
	} as const;

	const pairs = $derived(
		await client.liveQuery.possibleDuplicates({
			__args: { where: duplicatesOfConference(conferenceId), orderBy: { score: 'desc' } },
			id: true,
			score: true,
			reasons: true,
			status: true,
			userId: true,
			candidateId: true,
			user: account,
			candidate: account,
			userAttendances: attendance,
			candidateAttendances: attendance
		})
	);

	const active = $derived(pairs.filter((pair) => pair.status !== 'DISMISSED'));
	const dismissed = $derived(pairs.filter((pair) => pair.status === 'DISMISSED'));

	let scanning = $state(false);

	async function scan() {
		scanning = true;
		try {
			const promise = Promise.resolve(
				client.mutate.scanPossibleDuplicates({ __args: { conferenceId } })
			);
			toast.promise(promise, {
				...genericPromiseToastMessages,
				success: (count) => m.possibleDuplicatesScanned({ count })
			});
			await promise;
		} finally {
			scanning = false;
		}
	}

	function decide(id: string, status: 'OPEN' | 'CONFIRMED' | 'DISMISSED') {
		const promise = client.mutate.decidePossibleDuplicate({ __args: { id, status }, status: true });
		toast.promise(promise, genericPromiseToastMessages);
	}
</script>

{#snippet pairCard(pair: (typeof pairs)[number])}
	{@const percent = Math.round(pair.score * 100)}
	<div id="pair-{pair.id}" class="card bg-base-200 scroll-mt-6 shadow-sm">
		<div class="card-body gap-2 p-3">
			<DuplicateComparison
				reasons={pair.reasons}
				left={{ id: pair.userId, account: pair.user, attendances: pair.userAttendances }}
				right={{
					id: pair.candidateId,
					account: pair.candidate,
					attendances: pair.candidateAttendances
				}}
			>
				{#snippet corner()}
					<div class="flex flex-col items-center gap-1">
						<div
							class="radial-progress text-warning text-xs font-bold"
							style="--value:{percent}; --size:3rem; --thickness:4px;"
							role="progressbar"
							aria-valuenow={percent}
							aria-valuemin="0"
							aria-valuemax="100"
							title={m.possibleDuplicateMatch({ score: percent })}
						>
							<span class="text-base-content">{percent}%</span>
						</div>
						<!-- Always there, hidden unless confirmed, so the corner keeps its height -->
						<i
							class="fa-sharp-duotone fa-solid fa-link text-error {pair.status === 'CONFIRMED'
								? ''
								: 'invisible'}"
							title={pair.status === 'CONFIRMED' ? m.possibleDuplicateConfirmedBadge() : undefined}
							aria-label={pair.status === 'CONFIRMED'
								? m.possibleDuplicateConfirmedBadge()
								: undefined}
							aria-hidden={pair.status === 'CONFIRMED' ? undefined : true}
						></i>
					</div>
				{/snippet}
			</DuplicateComparison>
			<div class="card-actions justify-end">
				{#if pair.status === 'OPEN'}
					<button class="btn btn-xs" onclick={() => decide(pair.id, 'DISMISSED')}>
						<i class="fa-sharp-duotone fa-solid fa-people-arrows"></i>
						{m.possibleDuplicateDifferentPeople()}
					</button>
					<button class="btn btn-xs btn-warning" onclick={() => decide(pair.id, 'CONFIRMED')}>
						<i class="fa-sharp-duotone fa-solid fa-link"></i>
						{m.possibleDuplicateSamePerson()}
					</button>
				{:else}
					<button class="btn btn-xs btn-ghost" onclick={() => decide(pair.id, 'OPEN')}>
						<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
						{m.possibleDuplicateReopen()}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<section class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-2xl font-bold">{m.plausibilityPossibleDuplicates()}</h2>
		<button class="btn btn-sm" onclick={scan} disabled={scanning}>
			<i class="fa-sharp-duotone fa-solid fa-arrows-rotate {scanning ? 'fa-spin' : ''}"></i>
			{m.possibleDuplicatesScan()}
		</button>
	</div>
	<p class="text-base-content/70 max-w-3xl text-sm">{m.possibleDuplicatesDescription()}</p>

	{#if active.length > 0}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each active as pair (pair.id)}
				{@render pairCard(pair)}
			{/each}
		</div>
	{:else}
		<p class="text-base-content/60">{m.possibleDuplicatesNone()}</p>
	{/if}

	{#if dismissed.length > 0}
		<details class="collapse-arrow border-base-300 collapse border">
			<summary class="collapse-title font-semibold">
				{m.possibleDuplicatesDismissed({ count: dismissed.length })}
			</summary>
			<div class="collapse-content grid gap-4 lg:grid-cols-2">
				{#each dismissed as pair (pair.id)}
					{@render pairCard(pair)}
				{/each}
			</div>
		</details>
	{/if}
</section>
