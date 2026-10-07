<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	interface Props {
		title: string;
		href: ResolvedPathname;
		icon: string;
		active?: boolean;
	}

	let { title, href, icon, active }: Props = $props();
	let showAsActive = $derived.by(() => {
		if (active !== undefined) {
			return active;
		} else if (browser) {
			return $page.url.pathname.endsWith(href);
		} else {
			return false;
		}
	});
</script>

<li class="w-full" {title}>
	<a {href} class="flex w-full items-center gap-2 {showAsActive ? 'menu-active' : ''}">
		<i class="{showAsActive ? 'fas ' : 'fa-duotone'} {icon} w-5 text-center"></i>
		<span class="truncate">{title}</span>
	</a>
</li>
