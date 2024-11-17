<script module lang="ts">
	export interface PathSegment<Key extends string = string, IsParameter extends boolean = boolean> {
		key: Key;
		isParameter: IsParameter;
		value: IsParameter extends true ? string : never;
		href: string;
	}
</script>

<script lang="ts" generics="Parameter extends string">
	import { page } from '$app/stores';

	import type { Snippet } from 'svelte';

	// inspired by https://blog.aakashgoplani.in/generate-breadcrumb-and-navigation-in-sveltekit
	// TODO: This could be an actual library?

	interface Props {
		/**
		 * Available language tags which must be prefix stripped from the path
		 */
		readonly availableLanguageTags?: string[];
		/**
		 * The current URL
		 */
		readonly currentUrl?: URL;
		/// The output of
		/// ```
		/// import.meta.glob('./**/+page.svelte')
		/// ```
		/// based on the correct file path relative to where the import file is
		/// located in the file system tree!
		readonly importObject: Record<string, () => Promise<unknown>>;
		/**
		 * How to render a path segment
		 */
		pathSnippet?: Snippet<[PathSegment<Parameter, boolean>]>;
		/**
		 * How to render a delimeter between the path segments
		 */
		delimeterSnippet?: Snippet | 'disabled';
	}

	let {
		availableLanguageTags = [],
		currentUrl: currentUrlParam,
		importObject,
		pathSnippet = defaultPathSnippet,
		delimeterSnippet = defaultDelimeterSnippet
	}: Props = $props();

	// default params are not reactive, thatswhy the extra statement
	const currentUrl = $derived(currentUrlParam ?? $page.url);

	/**
	 * At compile time we check for the dir structure to determine which path
	 * segments are parameters. This struct holds that info
	 */
	interface StaticPathSegmentInfo {
		key: string;
		isParameter: boolean;
	}

	// check the imported dir structure to generate the StaticPathSegmentInfo array
	// the first dimension of this is the list of paths found in the filesystem
	// the second dimension is the list of path segments for each path
	const staticPaths: StaticPathSegmentInfo[][] = Object.keys(importObject).map((path) => {
		// remove .svelte and local relative path
		let pathSanitized = path.replace('.svelte', '').replace('./', '/');

		// for group layouts
		if (pathSanitized.includes('/(')) {
			pathSanitized = pathSanitized.substring(pathSanitized.indexOf(')/') + 1);
		}

		// remove leading /
		if (pathSanitized.startsWith('/')) {
			pathSanitized = pathSanitized.substring(1);
		}

		// remove +page
		pathSanitized = pathSanitized.replace('/+page', '');

		return pathSanitized.split('/').map((rawPathSegment) => {
			let isParameter = false;
			let sanitizedRawPathSegment = rawPathSegment;

			// check if it's a parameter
			if (sanitizedRawPathSegment.startsWith('[')) {
				if (!sanitizedRawPathSegment.endsWith(']')) {
					throw new Error('Invalid path segment parameter, expected closing ]: ' + rawPathSegment);
				}
				isParameter = true;
				sanitizedRawPathSegment = sanitizedRawPathSegment.substring(
					1,
					sanitizedRawPathSegment.length - 1
				);
			}

			return {
				key: sanitizedRawPathSegment,
				isParameter,
				value: sanitizedRawPathSegment
			};
		});
	});

	/**
	 * Finds the best matching static path array for a given path string segment array
	 * @param pathSegments
	 * @param staticPaths
	 */
	function findMatchingStaticPath(
		pathSegments: string[],
		staticPaths: StaticPathSegmentInfo[][]
	): StaticPathSegmentInfo[] {
		// we iteratively filter this variable to circle the possible matches closer each time
		let staticPathsFiltered = staticPaths.filter(
			(staticPath) => staticPath.length === pathSegments.length
		);
		let index = 0;

		for (const pathSegment of pathSegments) {
			staticPathsFiltered = staticPathsFiltered.filter((staticPathSegment) => {
				const currentLevelStaticSegment = staticPathSegment[index];

				// if the static path is shorter than the given one, we don't have a match
				if (!currentLevelStaticSegment) {
					return false;
				}

				// in case we have a parameter at this level we cannot say for sure if we have a match
				if (currentLevelStaticSegment.isParameter) {
					return true;
				}

				// lastly, if the key matches on this level, we have a match
				return currentLevelStaticSegment.key === pathSegment;
			});
			index++;
		}

		return staticPathsFiltered[0];
	}

	// the current path split into segments and sanitized by the language tag prefixes
	let currentPathRawSegments = $derived.by(() => {
		let path = currentUrl.pathname;

		const foundLocalePathSegment = availableLanguageTags.find((lang) =>
			path.startsWith(`/${lang}`)
		);
		if (foundLocalePathSegment) {
			// +2 for the two / before and after the language tag
			path = path.slice(foundLocalePathSegment.length + 2);
		}

		return path.split('/').filter((segment) => segment !== '');
	});

	// this holds the compose path info
	let currentPath: PathSegment<Parameter, boolean>[] = $derived.by(() => {
		const matchingStaticPath = findMatchingStaticPath(currentPathRawSegments, staticPaths);

		return matchingStaticPath.map((staticPathSegment, i) => {
			return {
				key: staticPathSegment.key as Parameter,
				isParameter: staticPathSegment.isParameter,
				value: currentPathRawSegments[i],
				href: currentUrl.origin + '/' + currentPathRawSegments.slice(0, i + 1).join('/')
			};
		});
	});
</script>

{#snippet defaultPathSnippet(pathSegment: PathSegment<Parameter, boolean>)}
	<a href={pathSegment.href}>
		{#if pathSegment.isParameter}
			{pathSegment.key}:
			{pathSegment.value}
		{:else}
			{pathSegment.key}
		{/if}
	</a>
{/snippet}

{#snippet defaultDelimeterSnippet()}
	>
{/snippet}

<div class="breadcrumbs">
	<ul>
		{#each currentPath as pathSegment, i}
			<li class="breadcrumb">
				{@render pathSnippet(pathSegment)}
				{#if delimeterSnippet !== 'disabled' && i !== currentPath.length - 1}
					<span class="breadcrumb-delimeter">
						{@render delimeterSnippet()}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.breadcrumbs {
		display: flex;
	}
</style>
