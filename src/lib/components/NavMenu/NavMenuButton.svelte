<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { isMobileOrTablet } from '$lib/services/detectMobile';

	interface Props {
		title: string;
		href: string;
		icon: string;
		active?: boolean;
		expanded: boolean;
	}

	let { title, href, icon, active, expanded = $bindable() }: Props = $props();
	let showAsActive = $derived.by(() => {
		if (active !== undefined) {
			return active;
		} else if (browser) {
			return $page.url.pathname.endsWith(href);
		} else {
			return false;
		}
	});

	function closeIfMobile() {
		if (isMobileOrTablet()) {
			expanded = false;
		}
	}
</script>

<li class="w-full overflow-hidden" {title}>
	<a
		{href}
		onclick={closeIfMobile}
		class="flex w-full items-center justify-center p-2 {showAsActive ? 'active' : ''}"
		aria-label="Toggle menu expand state"
	>
		<i class="fa-{showAsActive ? 'solid ' : 'duotone'} {icon} fa-duotone ml-2 w-5 text-center"></i>
		<p class="overflow-hidden duration-300 {expanded ? 'h-5 w-full pl-1' : 'h-0 w-0'}">{title}</p>
	</a>
</li>
