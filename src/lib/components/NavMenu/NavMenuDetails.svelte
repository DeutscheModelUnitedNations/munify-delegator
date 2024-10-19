<script lang="ts">
	interface Props {
		title: string;
		icon: string;
		small?: boolean;
	}

	let { title, icon, small = false }: Props = $props();
</script>

{#if small}
	<slot />
{:else}
	<li>
		<details>
			<summary>
				<i class="fa-duotone {icon} w-5 text-center"></i>
				<span>{title}</span>
			</summary>
			<ul>
				<slot />
			</ul>
		</details>
	</li>
{/if}
