<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		icon: string;
		children: Snippet;
	}

	let { title, icon, children }: Props = $props();
</script>

<li>
	<span class="menu-title flex items-center gap-2 pt-3">
		<i class="fa-sharp-duotone fa-solid {icon} w-5 text-center"></i>
		{title}
	</span>
	<ul>
		{@render children()}
	</ul>
</li>
