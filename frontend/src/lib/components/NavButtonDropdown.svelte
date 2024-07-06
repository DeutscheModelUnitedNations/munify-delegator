<script lang="ts">
	export let icon = 'fa-question';
	export let titel = '';
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
