<script lang="ts">
	import Breadcrumbs from '../../lib/components/Breadcrumbs.svelte';
	import type { PathSegment } from '../../lib/components/Breadcrumbs.svelte';
	import { availableLanguageTags } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import { graphql } from '$houdini';
	import type { LayoutServerLoadEvent } from './$types';
	import { browser } from '$app/environment';

	type Parameters = keyof LayoutServerLoadEvent['params'];

	const conferenceTitleQuery = graphql(`
		query ConferenceTitleQuery($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				title
			}
		}
	`);

	interface LocalizedBreadcrumb {
		translation: string;
		delayedLabel?: Promise<string>;
		icon: string;
	}

	const breadcrumbs: { [key: string]: LocalizedBreadcrumb } = {
		management: {
			translation: m.admininstration(),
			icon: 'fa-bars-progress'
		},
		conferenceId: {
			translation: m.conference(),
			icon: 'fa-flag'
		},
		delegations: {
			translation: m.delegations(),
			icon: 'fa-users-viewfinder'
		},
		dashboard: {
			translation: m.dashboard(),
			icon: 'fa-chart-pie'
		}
	};

	function getBreadcrumb(segment: PathSegment<Parameters, boolean>): LocalizedBreadcrumb {
		const breadcrumb = breadcrumbs[segment.key];
		if (!breadcrumb) {
			console.warn(`Breadcrumb not found: ${segment.key}`);
			return {
				translation: segment.key,
				icon: 'fa-question'
			};
		}

		if (segment.isParameter) {
			switch (segment.key) {
				case 'conferenceId':
					breadcrumb.delayedLabel = (async () => {
            //TODO we could probably load this data serverside
						if (browser) {
							const r = await conferenceTitleQuery.fetch({
								variables: { conferenceId: segment.value }
							});
							return r.data?.findUniqueConference?.title ?? segment.key;
						}

						return segment.key;
					})();
					break;
				case 'roleId':
					//TODO
					break;

				default:
					break;
			}
		}
		conferenceTitleQuery;
		return breadcrumb;
	}
</script>

<!-- ATTENTION: importObject is dir route specific. You cannot move this file without adjusting this
import path via the parameter! -->
<Breadcrumbs
	importObject={import.meta.glob('./**/+page.svelte')}
	availableLanguageTags={availableLanguageTags as any as string[]}
	delimeterSnippet="disabled"
>
	{#snippet pathSnippet(pathSegment: PathSegment<Parameters, boolean>)}
		<a href={pathSegment.href}>
			<i class="fa-duotone {getBreadcrumb(pathSegment).icon}"></i>
			<p class="ml-2">
				{#if getBreadcrumb(pathSegment).delayedLabel}
					<!-- content here -->
					{#await getBreadcrumb(pathSegment).delayedLabel}
						{getBreadcrumb(pathSegment).translation}
					{:then value}
						{value ?? getBreadcrumb(pathSegment).translation}
					{/await}
				{:else}
					{getBreadcrumb(pathSegment).translation}
				{/if}
			</p>
		</a>
	{/snippet}
</Breadcrumbs>
