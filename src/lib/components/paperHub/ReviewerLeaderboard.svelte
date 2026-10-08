<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import CollapsibleCard from '$lib/components/CollapsibleCard.svelte';
	import LoadState from '$lib/components/LoadState.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	function fetchLeaderboard() {
		return client.query.reviewerLeaderboard({
			__args: { conferenceId },
			anonymizedName: true,
			firstReviews: true,
			totalReviews: true,
			isCurrentUser: true
		});
	}

	let leaderboard = $state<Awaited<ReturnType<typeof fetchLeaderboard>>>();
	let leaderboardLoading = $state(false);
	let leaderboardError = $state<string>();

	$effect(() => {
		leaderboardLoading = true;
		leaderboardError = undefined;
		void fetchLeaderboard()
			.then((result) => {
				leaderboard = result;
			})
			.catch((error: unknown) => {
				leaderboardError = error instanceof Error ? error.message : String(error);
			})
			.finally(() => {
				leaderboardLoading = false;
			});
	});

	let maxReviews = $derived(
		Math.max(...(leaderboard?.map((reviewer) => reviewer.totalReviews) ?? [1]))
	);

	let isExpanded = $state(false);

	type Reviewer = NonNullable<typeof leaderboard>[number];

	const rankIcons = [
		'fa-trophy text-amber-400',
		'fa-medal text-slate-400',
		'fa-award text-amber-800'
	] as const;
</script>

{#snippet bar(count: number, colorClass: string, textClass: string, label: string)}
	{#if count > 0}
		<div
			class="{colorClass} transition-all duration-500 flex items-center justify-center min-w-6"
			style="width: {(count / maxReviews) * 100}%"
			title="{label}: {count}"
		>
			<span class="text-xs font-bold {textClass}">{count}</span>
		</div>
	{/if}
{/snippet}

{#snippet reviewerRow(reviewer: Reviewer, i: number)}
	<div
		class="flex items-center gap-3 rounded-box px-2 py-2 -mx-2 {reviewer.isCurrentUser
			? 'bg-primary/10 ring-1 ring-primary/30'
			: ''}"
	>
		<!-- Rank -->
		<span class="w-8 text-right font-bold text-base-content/50">
			{#if rankIcons[i]}
				<i class="fa-sharp-duotone fa-solid {rankIcons[i]}"></i>
			{:else}
				#{i + 1}
			{/if}
		</span>

		<!-- Name -->
		<span class="w-40 text-sm font-medium flex items-center gap-2 flex-wrap leading-tight">
			<span class="break-words">{reviewer.anonymizedName}</span>
			{#if reviewer.isCurrentUser}
				<span class="badge badge-primary badge-xs">{m.you()}</span>
			{/if}
		</span>

		<!-- Bar Chart -->
		<div class="flex-1 flex h-6 rounded-field overflow-hidden bg-base-300">
			{@render bar(reviewer.firstReviews, 'bg-primary', 'text-primary-content', m.firstReviews())}
			{@render bar(
				reviewer.totalReviews - reviewer.firstReviews,
				'bg-accent',
				'text-accent-content',
				m.additionalReviews()
			)}
		</div>
	</div>
{/snippet}

<CollapsibleCard
	icon="ranking-star"
	title={m.reviewerLeaderboard()}
	description={m.reviewerLeaderboardDescription()}
	bind:expanded={isExpanded}
	contentClass="p-4 pt-4"
>
	{#snippet badge()}
		{#if leaderboard?.length}
			<div class="badge badge-primary badge-lg gap-2">
				<i class="fa-sharp-duotone fa-solid fa-users"></i>
				{leaderboard.length}
			</div>
		{/if}
	{/snippet}

	<LoadState loading={leaderboardLoading} error={leaderboardError}>
		{#if leaderboard?.length}
			<div class="space-y-2">
				{#each leaderboard as reviewer, i (i)}
					{@render reviewerRow(reviewer, i)}
				{/each}

				<!-- Legend -->
				<div class="flex gap-6 text-sm text-base-content/60 mt-4 pt-4 border-t border-base-300">
					<span class="flex items-center gap-2">
						<span class="inline-block w-3 h-3 bg-primary rounded-field"></span>
						{m.firstReviews()}
					</span>
					<span class="flex items-center gap-2">
						<span class="inline-block w-3 h-3 bg-accent rounded-field"></span>
						{m.additionalReviews()}
					</span>
				</div>
			</div>
		{:else}
			<div class="alert alert-info">
				<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
				<span>{m.noReviewsYet()}</span>
			</div>
		{/if}
	</LoadState>
</CollapsibleCard>
