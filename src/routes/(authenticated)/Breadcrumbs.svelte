<script lang="ts">
	import { Breadcrumbs } from 'sveltekit-breadcrumbs';
	import type { PathSegment } from 'sveltekit-breadcrumbs';
	import { locales } from '#lib/paraglide/runtime.js';
	import { breadcrumbs, hasPageAt, staticFirst, type LocalizedBreadcrumb } from './breadcrumbs';
	import ConferenceSwitcher from './ConferenceSwitcher.svelte';
	import SurveyCrumbTitle from './SurveyCrumbTitle.svelte';
	import type { LayoutProps } from './$types';

	type Parameters = keyof LayoutProps['params'];

	type PathSegmentType = PathSegment<Parameters, boolean>;

	const globbed = import.meta.glob('./**/+page*.svelte');
	// The library takes the first page that fits a URL, so the order is what makes it right
	const pageKeys = staticFirst(Object.keys(globbed));
	const pages = Object.fromEntries(pageKeys.map((key) => [key, globbed[key]]));

	/** A crumb for a folder with no page of its own (`team`) has nowhere to go, so it is not a link */
	const hasPage = (segment: PathSegmentType) =>
		hasPageAt(new URL(segment.href).pathname.split('/').filter(Boolean), pageKeys);

	function getBreadcrumb(segment: PathSegmentType): LocalizedBreadcrumb {
		const breadcrumb = breadcrumbs[segment.key];
		if (!breadcrumb) {
			console.warn(`Breadcrumb not found: ${segment.key}`);
			return {
				translation: () => segment.key,
				icon: 'question'
			};
		}

		return breadcrumb;
	}
</script>

{#snippet delimiter()}
	<i
		class="fa-sharp-duotone fa-solid fa-chevron-right text-base-content/30 text-[0.6rem]"
		aria-hidden="true"
	></i>
{/snippet}

<!-- ATTENTION: importObject is dir route specific. You cannot move this file without adjusting this
import path via the parameter! The home link is the wordmark in the header, so there is no homePath. -->
<Breadcrumbs importObject={pages} availableLanguageTags={[...locales]} delimiterSnippet={delimiter}>
	{#snippet pathSnippet(pathSegment: PathSegmentType)}
		{#if pathSegment.key === 'conferenceId' && pathSegment.isParameter}
			<ConferenceSwitcher conferenceId={pathSegment.value} />
		{:else}
			{@const breadcrumb = getBreadcrumb(pathSegment)}
			{#snippet label()}
				<i class="fa-sharp-duotone fa-solid fa-{breadcrumb.icon}"></i>
				<span class="crumb-label ml-1 truncate">
					{#if pathSegment.key === 'surveyId' && pathSegment.isParameter}
						<svelte:boundary>
							<SurveyCrumbTitle surveyId={pathSegment.value} />
							{#snippet pending()}{breadcrumb.translation()}{/snippet}
							{#snippet failed()}{breadcrumb.translation()}{/snippet}
						</svelte:boundary>
					{:else}
						{breadcrumb.translation()}
					{/if}
				</span>
			{/snippet}
			{#if hasPage(pathSegment)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- sveltekit-breadcrumbs builds href as an absolute URL (page origin + path), which resolve() cannot take -->
				<a
					class="btn btn-ghost btn-sm max-sm:px-1.5 max-w-48 !no-underline"
					href={pathSegment.href}
				>
					{@render label()}
				</a>
			{:else}
				<span class="btn btn-ghost btn-sm max-sm:px-1.5 pointer-events-none max-w-48 !no-underline">
					{@render label()}
				</span>
			{/if}
		{/if}
	{/snippet}
</Breadcrumbs>

<style>
	/* Phones show the trail as icons and spell out only the page they are on */
	@media (width < 40rem) {
		:global(.breadcrumbs li:not(:last-child)) .crumb-label {
			display: none;
		}
	}
</style>
