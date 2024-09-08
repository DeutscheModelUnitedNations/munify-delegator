<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: string;
		title: string;
		children: Snippet;
	}

	let { icon, title, children }: Props = $props();
</script>

<li>
	<details>
		<summary>
			<i class={`fa-duotone ${icon} w-5`}></i>
			<div>{title}</div>
		</summary>
		<ul>
			{@render children()}
		</ul>
	</details>
</li>
