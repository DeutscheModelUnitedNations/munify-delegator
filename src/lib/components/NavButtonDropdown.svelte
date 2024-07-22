<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		icon: string;
		titel: string;
		children: Snippet;
	}

	let { icon, titel, children }: Props = $props();
</script>

<li>
	<details>
		<summary>
			<i class={`fa-duotone ${icon} w-5`} />
			<div>{titel}</div>
		</summary>
		<ul>
			{@render children()}
		</ul>
	</details>
</li>
