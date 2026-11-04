<script lang="ts">
	import { resolve } from '$app/paths';
	import { DocsShell } from '@deutschemodelunitednations/docs-kit/components';
	import { DOCS_ICON_PREFIX } from '#lib/docs/render';
	import { nav } from '#lib/docs/nav';
	import { m } from '#lib/paraglide/messages';
	import { localizeHref } from '#lib/paraglide/runtime';
	import HomeNavbar from '../HomeNavbar.svelte';
	import type { LayoutProps } from './$types';

	/** The user manual: public, in the landing page's frame, with the manual's sidebar. */
	let { data, children, params }: LayoutProps = $props();

	const current = $derived((params.slug ?? '').replace(/\/+$/, ''));
</script>

<div class="flex w-full flex-col">
	<HomeNavbar />
	<DocsShell
		{nav}
		titles={data.titles}
		{current}
		href={(slug) => localizeHref(resolve('/docs/[...slug]', { slug }))}
		labels={{
			menu: m.docsMenu(),
			close: m.close(),
			navigation: m.docsTitle(),
			overview: m.docsOverview()
		}}
		iconPrefix={DOCS_ICON_PREFIX}
	>
		{@render children()}
	</DocsShell>
</div>
