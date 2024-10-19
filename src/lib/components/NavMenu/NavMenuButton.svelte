<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	interface Props {
		title: string;
		href: string;
		icon: string;
		active?: boolean;
		small?: boolean;
	}

	let { title, href, icon, active, small = false }: Props = $props();
	let showAsActive = $derived(() => {
		if (active !== undefined) {
			return active;
		} else if (browser) {
			return $page.url.pathname.replaceAll('.', '').endsWith(href);
		} else {
			return false;
		}
	});
</script>

<li class="w-full overflow-hidden" {title}>
	<a {href} class="flex w-full items-center justify-center px-0" aria-label="Toggle menu expand state">
		<i class="fa-{showAsActive() ? 'solid' : 'duotone'} {icon} fa-duotone ml-2 w-5 text-center"></i>
		<p class="overflow-hidden duration-300 {small ? 'w-0' : 'w-full pl-1'}">{title}</p>
	</a>
</li>
