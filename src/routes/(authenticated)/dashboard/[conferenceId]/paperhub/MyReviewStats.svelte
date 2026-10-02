<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Only reviewers get review stats back; for anyone else the query answers null.
	const myStats = $derived(
		await client.liveQuery.myReviewStats({
			__args: { conferenceId },
			firstReviews: true,
			followUpReviews: true,
			totalReviews: true
		})
	);
</script>

{#if myStats}
	<div class="border-t border-base-300 pt-4">
		<h4 class="text-sm font-semibold mb-2">{m.yourReviewStats()}</h4>
		<div class="flex items-center gap-6">
			<span class="flex items-center gap-2">
				<i class="fa-solid fa-star text-primary"></i>
				<span class="text-sm">{m.firstReviews()}:</span>
				<span class="font-bold">{myStats.firstReviews}</span>
			</span>
			<span class="flex items-center gap-2">
				<i class="fa-solid fa-plus text-accent"></i>
				<span class="text-sm">{m.followUpReviews()}:</span>
				<span class="font-bold">{myStats.followUpReviews}</span>
			</span>
			<span class="flex items-center gap-2 text-base-content/60">
				<i class="fa-solid fa-equals"></i>
				<span class="text-sm">{m.totalReviews()}:</span>
				<span class="font-bold">{myStats.totalReviews}</span>
			</span>
		</div>
	</div>
{/if}
