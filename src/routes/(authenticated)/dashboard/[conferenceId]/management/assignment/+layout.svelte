<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Tab from '$lib/components/tabs/Tab.svelte';
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { LayoutProps } from './$types';
	import DraftStatus from './DraftStatus.svelte';

	let { children, params }: LayoutProps = $props();

	// The route id is fixed per page, unlike `page.params`, so reading it here is safe.
	const tab = $derived(page.route.id?.split('/').pop());

	const tabs = $derived(
		(
			[
				['introduction', m.assignmentTabIntroduction(), 'circle-info'],
				['sighting', m.assignmentTabSighting(), 'eye'],
				['weighting', m.assignmentTabWeighting(), 'scale-balanced'],
				['singles', m.assignmentTabSingles(), 'user-tie'],
				['delegations', m.assignmentTabDelegations(), 'split'],
				['finish', m.assignmentTabFinish(), 'flag-checkered']
			] as const
		).map(([id, title, icon]) => ({
			id,
			title,
			icon,
			href: resolve(`/(authenticated)/dashboard/[conferenceId]/management/assignment/${id}`, {
				conferenceId: params.conferenceId
			})
		}))
	);
</script>

<div class="flex w-full flex-col gap-4 py-4">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h2 class="text-2xl font-bold">{m.adminAssignment()}</h2>
			<p class="text-base-content/70 max-w-3xl text-sm">{m.assignmentIntro()}</p>
		</div>
		<DraftStatus conferenceId={params.conferenceId} />
	</div>

	<Tabs>
		{#each tabs as entry (entry.id)}
			<Tab active={tab === entry.id} title={entry.title} icon={entry.icon} href={entry.href} />
		{/each}
	</Tabs>

	{@render children()}
</div>
