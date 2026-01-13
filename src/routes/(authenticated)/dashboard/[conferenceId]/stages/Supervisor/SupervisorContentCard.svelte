<script lang="ts">
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		isStateParticipantRegistration: boolean;
		applied: boolean;
		title: string;
		detailSpace: Snippet;
		memberSpace: Snippet;
	}

	let {
		isStateParticipantRegistration,
		applied,
		title,
		detailSpace,
		memberSpace
	}: Props = $props();
</script>

<DashboardContentCard {title} class="bg-base-200 border-base-300 mt-4">
	{#if isStateParticipantRegistration}
		<div
			class="badge {applied
				? 'badge-success'
				: 'badge-warning'} badge-lg absolute top-0 right-4 z-10 -translate-y-1/2"
		>
			{#if applied}
				<i class="fa-solid fa-circle-check mr-2"></i> {m.applied()}
			{:else}
				<i class="fa-solid fa-hourglass-half mr-2"></i> {m.notApplied()}
			{/if}
		</div>
	{/if}

	<div class="w-full min-w-0 overflow-x-auto">
		{@render detailSpace()}
	</div>
	<div class="mt-10">
		{@render memberSpace()}
	</div>
</DashboardContentCard>
