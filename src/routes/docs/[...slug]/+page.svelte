<script lang="ts">
	import { resolve } from '$app/paths';
	import { DocsArticle } from '@deutschemodelunitednations/docs-kit/components';
	import { DOCS_ICON_PREFIX } from '#lib/docs/render';
	import { nav } from '#lib/docs/nav';
	import { m } from '#lib/paraglide/messages';
	import { localizeHref } from '#lib/paraglide/runtime';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const title = $derived(
		data.doc?.frontmatter.title ?? nav.findCategory(data.slug)?.label() ?? data.slug
	);
</script>

<svelte:head>
	<title>{title} - MUNify DELEGATOR</title>
	{#if data.doc?.frontmatter.description}
		<meta name="description" content={data.doc.frontmatter.description} />
	{/if}
</svelte:head>

<DocsArticle
	{nav}
	slug={data.slug}
	doc={data.doc}
	titles={data.titles}
	href={(slug) => localizeHref(resolve('/docs/[...slug]', { slug }))}
	labels={{ onThisPage: m.docsOnThisPage(), editPage: m.docsEditPage() }}
	fallbackNotice={data.fallback ? m.docsFallbackNotice() : undefined}
	editUrl={data.doc
		? `https://github.com/DeutscheModelUnitedNations/munify-delegator/edit/main/docs/${data.doc.locale}/${data.slug}.md`
		: undefined}
	iconPrefix={DOCS_ICON_PREFIX}
/>
