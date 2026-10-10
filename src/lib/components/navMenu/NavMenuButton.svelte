<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	interface Props {
		title: string;
		href: ResolvedPathname;
		icon: string;
		active?: boolean;
		/** Stay active on the pages below `href` too, e.g. a detail page of this list. */
		includeSubpages?: boolean;
		/**
		 * Something here wants a look: a small red dot that pings sits at the end of the entry.
		 * `attentionLabel` says what, for those who cannot see the dot.
		 */
		attention?: boolean;
		attentionLabel?: string;
	}

	let {
		title,
		href,
		icon,
		active,
		includeSubpages = false,
		attention = false,
		attentionLabel
	}: Props = $props();
	function isActivePath(pathname: string, target: string, withSubpages: boolean) {
		return pathname.endsWith(target) || (withSubpages && pathname.includes(`${target}/`));
	}

	let showAsActive = $derived(
		active ?? (browser && isActivePath($page.url.pathname, href, includeSubpages))
	);
</script>

<li class="w-full" {title}>
	<a {href} class="flex w-full items-center gap-2 {showAsActive ? 'menu-active' : ''}">
		<i class="{showAsActive ? 'fas ' : 'fa-sharp-duotone fa-solid'} {icon} w-5 text-center"></i>
		<span class="truncate">{title}</span>
		{#if attention}
			<span class="relative ml-auto flex size-2.5 shrink-0" title={attentionLabel}>
				<span
					class="bg-error absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
				></span>
				<span class="bg-error relative inline-flex size-2.5 rounded-full"></span>
				{#if attentionLabel}<span class="sr-only">{attentionLabel}</span>{/if}
			</span>
		{/if}
	</a>
</li>
