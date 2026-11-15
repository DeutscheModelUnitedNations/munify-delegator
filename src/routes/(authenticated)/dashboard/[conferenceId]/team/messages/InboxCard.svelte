<!--
	@component
	A card of the inbox overview: what it opens, a line of detail and, where something waits, a
	badge.
-->
<script lang="ts">
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		href: ResolvedPathname;
		icon: string;
		/** The icon's colour class */
		tone?: string;
		title: string;
		detail: string;
		/** Something waits here: the title stands out */
		waiting?: boolean;
		badge?: string;
		testid: string;
	}

	let {
		href,
		icon,
		tone = 'text-primary',
		title,
		detail,
		waiting = false,
		badge,
		testid
	}: Props = $props();
</script>

<a
	{href}
	class="border-base-300 bg-base-100 hover:bg-base-200 rounded-box flex items-center gap-3 border p-4 transition-colors"
	data-testid={testid}
>
	<i aria-hidden="true" class="ph-duotone {icon} {tone} text-2xl"></i>
	<span class="flex min-w-0 flex-1 flex-col">
		<span class={['truncate', waiting && 'font-semibold']}>{title}</span>
		<span class="text-base-content/70 text-xs">{detail}</span>
	</span>
	{#if badge}<span class="badge badge-primary badge-sm shrink-0">{badge}</span>{/if}
</a>
