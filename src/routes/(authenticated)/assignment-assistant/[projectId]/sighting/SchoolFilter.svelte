<script lang="ts">
	import { graphql } from '$houdini';
	import { queryParameters } from 'sveltekit-search-params';
	import { getSchools } from '../appData.svelte';

	interface Params {
		filter: string[];
	}

	let { filter = $bindable() }: Params = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each getSchools() as school (school.school)}
		<button
			class="btn btn-xs {filter.includes(school.school) ? 'btn-primary' : 'btn-outline'}"
			onclick={() => {
				if (filter.includes(school.school)) {
					filter = filter.filter((s) => s !== school.school);
				} else {
					filter = [...filter, school.school];
				}
			}}
		>
			{school.school}
			<span class="badge badge-xs">{school.count}</span>
			<span class="badge badge-xs badge-neutral">{school.members}</span>
		</button>
	{/each}
</div>
