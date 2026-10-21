<!--
	@component
	Live numbers for the paper hub's card on the team dashboard. Shows nothing while no paper was
	submitted, which is also what a team member without review access sees: the papers are not
	theirs to read, so every count comes back 0. Only fetches; `PaperHubStats` draws.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import type { PaperstatusEnum } from '#lib/api/rumbleClient/client.js';
	import { asCount } from '#lib/components/tanStackTable/serverQuery.js';
	import PaperHubStats from './PaperHubStats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	// Drafts are not submitted yet and nobody can review them, so they are left out.
	const countWith = (status: PaperstatusEnum) =>
		client.liveQuery.papersCount({
			__args: { where: { conference: { id: { eq: conferenceId } }, status } }
		});

	const counts = $derived(
		await Promise.all([
			countWith('SUBMITTED'),
			countWith('REVISED'),
			countWith('CHANGES_REQUESTED'),
			countWith('ACCEPTED'),
			// Null rather than an error for anyone who is not a reviewer
			client.liveQuery.myReviewStats({ __args: { conferenceId }, totalReviews: true })
		]).then(([submitted, revised, changesRequested, accepted, myStats]) => ({
			awaiting: asCount(submitted) + asCount(revised),
			changes: asCount(changesRequested),
			approved: asCount(accepted),
			reviews: myStats?.totalReviews
		}))
	);
</script>

<PaperHubStats {...counts} />
