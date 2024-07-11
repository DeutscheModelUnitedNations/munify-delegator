<script lang="ts">
	interface Props {
		icon: string;
		titel: string;
	}

	let { icon, titel }: Props = $props();
</script>

<li>
	<details>
		<summary>
			<i class={`fa-duotone ${icon} w-5`} />
			<div>{titel}</div>
		</summary>
		<ul>
			<slot />
		</ul>
	</details>
</li>
