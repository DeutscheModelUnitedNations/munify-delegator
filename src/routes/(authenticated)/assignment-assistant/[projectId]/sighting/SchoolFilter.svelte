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
	<button
		class="btn btn-xs {filter.length === 0 ? 'btn-primary' : 'btn-error'}"
		onclick={() => {
			filter = [];
		}}
	>
		Alle Schulen
	</button>
	{#each getSchools() as school (school.school)}
		<button
			class="btn btn-xs flex flex-col {filter.includes(school.school)
				? 'btn-primary'
				: 'btn-outline'}"
			onclick={() => {
				if (filter.includes(school.school)) {
					filter = filter.filter((s) => s !== school.school);
				} else {
					filter = [...filter, school.school];
				}
			}}
		>
			<div>
				{school.school}
			</div>
			<div>
				<span class="badge badge-xs">
					<i class="fas fa-users-viewfinder"></i>
					{school.count}
				</span>
				<span class="badge badge-xs">
					<i class="fas fa-users"></i>
					{school.members}
				</span>
			</div>
		</button>
	{/each}
</div>
