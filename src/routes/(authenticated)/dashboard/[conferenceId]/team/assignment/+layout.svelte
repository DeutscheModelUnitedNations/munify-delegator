<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { m } from '#lib/paraglide/messages';
	import type { LayoutProps } from './$types';
	import { ASSIGNMENT_TAB_SKELETONS } from '#lib/data/teamSkeletons';
	import DraftStatus from './DraftStatus.svelte';

	let { children, params }: LayoutProps = $props();

	// Read once: the team shell keys this section by its path, so this instance never changes
	// conference. Read live, every navigation (a card turn in the sighting included) handed over a
	// fresh `params`, and a re-run inside hydration's pending batch saw it as `{}`: `resolve` threw
	// `route_param_missing` for the tabs' links.
	const conferenceId = untrack(() => params.conferenceId);

	// The route id is fixed per page, unlike `page.params`, so reading it here is safe.
	const tab = $derived(page.route.id?.split('/').pop());
	// The tabs stay; only the tab's content below them loads (the team shell leaves this section's
	// pages to this layout, see `boundaryKey`).
	const pathname = $derived(page.url.pathname);
	const skeleton = $derived(
		ASSIGNMENT_TAB_SKELETONS[tab ?? ''] ?? ASSIGNMENT_TAB_SKELETONS.sighting
	);

	const tabs = $derived(
		(
			[
				['introduction', m.assignmentTabIntroduction(), 'info'],
				['sighting', m.assignmentTabSighting(), 'eye'],
				['weighting', m.assignmentTabWeighting(), 'scales'],
				['singles', m.assignmentTabSingles(), 'user-sound'],
				['delegations', m.assignmentTabDelegations(), 'arrows-split'],
				['finish', m.assignmentTabFinish(), 'flag-checkered']
			] as const
		).map(([id, title, icon]) => ({
			id,
			title,
			icon,
			href: resolve(`/(authenticated)/dashboard/[conferenceId]/team/assignment/${id}`, {
				conferenceId
			})
		}))
	);
</script>

<div class="flex w-full flex-col gap-4 py-4">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<p class="text-base-content/70 max-w-3xl text-sm">{m.assignmentIntro()}</p>
		</div>
		<DraftStatus {conferenceId} />
	</div>

	<Tabs>
		{#each tabs as entry (entry.id)}
			<Tab active={tab === entry.id} title={entry.title} icon={entry.icon} href={entry.href} />
		{/each}
	</Tabs>

	<PageBoundary key={pathname} {skeleton}>
		{@render children()}
	</PageBoundary>
</div>
