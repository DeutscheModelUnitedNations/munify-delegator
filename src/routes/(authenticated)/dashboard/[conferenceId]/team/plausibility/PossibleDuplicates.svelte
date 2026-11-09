<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
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
			inferred: true,
			userId: true,
			candidateId: true,
			user: account,
			candidate: account,
			userAttendances: attendance,
			candidateAttendances: attendance
		})
	);

	const open = $derived(pairs.filter((pair) => pair.status === 'OPEN'));
	// decided pairs before those the links made (`inferred`), each by score
	const confirmed = $derived(
		pairs
			.filter((pair) => pair.status === 'CONFIRMED')
			.sort((a, b) => Number(a.inferred) - Number(b.inferred))
	);
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

	function decide({ id, status }: { id: string; status: 'OPEN' | 'CONFIRMED' | 'DISMISSED' }) {
		const promise = client.mutate.decidePossibleDuplicate({ __args: { id, status }, status: true });
		toast.promise(promise, genericPromiseToastMessages);
	}

	let dismissedOpen = $state(false);
</script>

{#snippet matchBadge(pair: (typeof pairs)[number])}
	{@const percent = Math.round(pair.score * 100)}
	{@const confirmed = pair.status === 'CONFIRMED'}
	<div class="flex flex-col items-center gap-1">
		{#if pair.inferred}
			<i
				aria-hidden="true"
				class="ph-duotone ph-link text-error text-2xl"
				title={m.possibleDuplicateInferred()}
				role="img"
				aria-label={m.possibleDuplicateInferred()}
			></i>
		{:else}
			<div
				class="radial-progress text-xs font-bold {confirmed ? 'text-error' : 'text-warning'}"
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
			{@const label = confirmed ? m.possibleDuplicateConfirmedBadge() : undefined}
			<i
				class="ph-duotone ph-link text-error {confirmed ? '' : 'invisible'}"
				title={label}
				aria-label={label}
				aria-hidden={confirmed ? undefined : true}
			></i>
		{/if}
	</div>
{/snippet}

{#snippet pairActions(pair: (typeof pairs)[number])}
	<div class="card-actions items-center justify-end">
		{#if pair.inferred}
			<!-- follows the decided pairs; reopening one of those takes it back -->
			<span class="text-base-content/60 text-xs">{m.possibleDuplicateInferred()}</span>
		{:else if pair.status === 'OPEN'}
			<button class="btn btn-xs" onclick={() => decide({ id: pair.id, status: 'DISMISSED' })}>
				<i aria-hidden="true" class="ph-duotone ph-arrows-left-right"></i>
				{m.possibleDuplicateDifferentPeople()}
			</button>
			<button
				class="btn btn-xs btn-warning"
				onclick={() => decide({ id: pair.id, status: 'CONFIRMED' })}
			>
				<i aria-hidden="true" class="ph-duotone ph-link"></i>
				{m.possibleDuplicateSamePerson()}
			</button>
		{:else}
			<button class="btn btn-xs btn-ghost" onclick={() => decide({ id: pair.id, status: 'OPEN' })}>
				<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
				{m.possibleDuplicateReopen()}
			</button>
		{/if}
	</div>
{/snippet}

{#snippet pairCard(pair: (typeof pairs)[number])}
	<div
		id="pair-{pair.id}"
		class="card bg-base-200 scroll-mt-6 shadow-sm {pair.status === 'CONFIRMED'
			? 'border-error/40 border'
			: ''}"
	>
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
					{@render matchBadge(pair)}
				{/snippet}
			</DuplicateComparison>
			{@render pairActions(pair)}
		</div>
	</div>
{/snippet}

<section class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-2xl font-bold">{m.plausibilityPossibleDuplicates()}</h2>
		<button class="btn btn-sm" onclick={scan} disabled={scanning}>
			<i aria-hidden="true" class="ph-duotone ph-arrows-clockwise {scanning ? 'animate-spin' : ''}"
			></i>
			{m.possibleDuplicatesScan()}
		</button>
	</div>
	<p class="text-base-content/70 max-w-3xl text-sm">{m.possibleDuplicatesDescription()}</p>

	{#if open.length > 0}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each open as pair (pair.id)}
				{@render pairCard(pair)}
			{/each}
		</div>
	{:else if confirmed.length === 0}
		<p class="text-base-content/60">{m.possibleDuplicatesNone()}</p>
	{/if}

	{#if confirmed.length > 0}
		<h3 class="mt-2 flex items-center gap-2 text-lg font-semibold">
			<i aria-hidden="true" class="ph-duotone ph-link text-error"></i>
			{m.possibleDuplicatesConfirmed({ count: confirmed.length })}
		</h3>
		<div class="grid gap-4 lg:grid-cols-2">
			{#each confirmed as pair (pair.id)}
				{@render pairCard(pair)}
			{/each}
		</div>
	{/if}

	{#if dismissed.length > 0}
		<div
			class="collapse-arrow border-base-300 collapse border {dismissedOpen ? 'collapse-open' : ''}"
		>
			<button
				type="button"
				class="collapse-title w-full cursor-pointer text-left font-semibold"
				aria-expanded={dismissedOpen}
				onclick={() => (dismissedOpen = !dismissedOpen)}
			>
				{m.possibleDuplicatesDismissed({ count: dismissed.length })}
			</button>
			<div class="collapse-content grid gap-4 lg:grid-cols-2">
				{#each dismissed as pair (pair.id)}
					{@render pairCard(pair)}
				{/each}
			</div>
		</div>
	{/if}
</section>
