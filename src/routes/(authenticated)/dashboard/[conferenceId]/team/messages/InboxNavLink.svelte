<!--
	@component
	One entry below "Messages" in the team menu: a link with a count at its end (unread messages,
	or waiting reports), marked while it is the one on screen.
-->
<script lang="ts">
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		href: ResolvedPathname;
		title: string;
		active: boolean;
		count?: number;
		/** What the count counts, for those who cannot see the badge */
		countLabel?: string;
		icon?: string;
		testid: string;
	}

	let { href, title, active, count = 0, countLabel, icon, testid }: Props = $props();
</script>

<li class="min-w-0" {title}>
	<a
		{href}
		class={['flex w-full min-w-0 items-center gap-2', active && 'menu-active']}
		aria-current={active ? 'page' : undefined}
		data-testid={testid}
	>
		{#if icon}<i aria-hidden="true" class="ph-duotone {icon}"></i>{/if}
		<span class="min-w-0 flex-1 truncate">{title}</span>
		{#if count > 0}
			<span class="badge badge-primary badge-xs shrink-0">
				<span aria-hidden="true">{count}</span>
				<span class="sr-only">{countLabel}</span>
			</span>
		{/if}
	</a>
</li>
