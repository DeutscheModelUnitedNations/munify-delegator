<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const leaderboardQuery = graphql(`
		query ReviewerLeaderboardQuery($conferenceId: String!) {
			reviewerLeaderboard(conferenceId: $conferenceId) {
				anonymizedName
				firstReviews
				totalReviews
				isCurrentUser
			}
		}
	`);

	$effect(() => {
		leaderboardQuery.fetch({ variables: { conferenceId } });
	});

	let maxReviews = $derived(
		Math.max(...($leaderboardQuery.data?.reviewerLeaderboard?.map((r) => r.totalReviews) ?? [1]))
	);

	let isExpanded = $state(false);
</script>

<div class="card bg-base-200 border border-base-300">
	<!-- Collapsible Header -->
	<div
		class="p-4 flex items-center justify-between cursor-pointer hover:bg-base-300/30 transition-colors rounded-t-lg"
		class:rounded-b-lg={!isExpanded}
		onclick={() => (isExpanded = !isExpanded)}
		onkeypress={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
		role="button"
		tabindex="0"
	>
		<div class="flex items-center gap-3">
			<i class="fa-solid {isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-base-content/50"
			></i>
			<i class="fa-solid fa-ranking-star text-primary text-xl"></i>
			<div>
				<h3 class="text-lg font-bold">{m.reviewerLeaderboard()}</h3>
				<p class="text-sm text-base-content/60">{m.reviewerLeaderboardDescription()}</p>
			</div>
		</div>
		{#if $leaderboardQuery.data?.reviewerLeaderboard?.length}
			<div class="badge badge-primary badge-lg gap-2">
				<i class="fa-solid fa-users"></i>
				{$leaderboardQuery.data.reviewerLeaderboard.length}
			</div>
		{/if}
	</div>

	{#if isExpanded}
		<div class="p-4 pt-4">
			{#if $leaderboardQuery.fetching}
				<div class="flex justify-center p-8">
					<i class="fa-duotone fa-spinner fa-spin text-4xl"></i>
				</div>
			{:else if $leaderboardQuery.errors?.length}
				<div class="alert alert-error">
					<i class="fa-solid fa-exclamation-triangle"></i>
					<span>{$leaderboardQuery.errors[0].message}</span>
				</div>
			{:else if $leaderboardQuery.data?.reviewerLeaderboard?.length}
				<div class="space-y-2">
					{#each $leaderboardQuery.data.reviewerLeaderboard as reviewer, i}
						<div
							class="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 {reviewer.isCurrentUser
								? 'bg-primary/10 ring-1 ring-primary/30'
								: ''}"
						>
							<!-- Rank -->
							<span class="w-8 text-right font-bold text-base-content/50">
								{#if i === 0}
									<i class="fa-solid fa-trophy text-amber-400"></i>
								{:else if i === 1}
									<i class="fa-solid fa-medal text-slate-400"></i>
								{:else if i === 2}
									<i class="fa-solid fa-award text-amber-800"></i>
								{:else}
									#{i + 1}
								{/if}
							</span>

							<!-- Name -->
							<span
								class="w-48 truncate font-medium flex items-center gap-2"
								title={reviewer.anonymizedName}
							>
								{reviewer.anonymizedName}
								{#if reviewer.isCurrentUser}
									<span class="badge badge-primary badge-xs">{m.you()}</span>
								{/if}
							</span>

							<!-- Bar Chart -->
							<div class="flex-1 flex h-6 rounded overflow-hidden bg-base-300">
								<!-- First reviews bar -->
								<div
									class="bg-primary transition-all duration-500"
									style="width: {(reviewer.firstReviews / maxReviews) * 100}%"
									title="{m.firstReviews()}: {reviewer.firstReviews}"
								></div>
								<!-- Additional reviews bar -->
								<div
									class="bg-accent transition-all duration-500"
									style="width: {((reviewer.totalReviews - reviewer.firstReviews) / maxReviews) *
										100}%"
									title="{m.additionalReviews()}: {reviewer.totalReviews - reviewer.firstReviews}"
								></div>
							</div>

							<!-- Total count -->
							<span class="w-12 text-right text-sm font-mono">{reviewer.totalReviews}</span>
						</div>
					{/each}

					<!-- Legend -->
					<div class="flex gap-6 text-sm text-base-content/60 mt-4 pt-4 border-t border-base-300">
						<span class="flex items-center gap-2">
							<span class="inline-block w-3 h-3 bg-primary rounded"></span>
							{m.firstReviews()}
						</span>
						<span class="flex items-center gap-2">
							<span class="inline-block w-3 h-3 bg-accent rounded"></span>
							{m.additionalReviews()}
						</span>
					</div>
				</div>
			{:else}
				<div class="alert alert-info">
					<i class="fa-solid fa-info-circle"></i>
					<span>{m.noReviewsYet()}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
