<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		icon: string;
		small?: boolean;
		children: Snippet;
	}

	let { title, icon, small = false, children }: Props = $props();
</script>

{#if small}
	{@render children()}
{:else}
	<li>
		<details>
			<summary>
				<i class="fa-duotone {icon} w-5 text-center"></i>
				<span>{title}</span>
			</summary>
			<ul>
				{@render children()}
			</ul>
		</details>
	</li>
{/if}
