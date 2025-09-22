<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import { graphql } from '$houdini';

	let { data }: { data: PageData } = $props();

	addToPanel('data', () => data);

	let query = $derived(data.ManagementCommitteeQuery);
	let committees = $derived($query.data.findManyCommittees);

	let newItemTitle = $state('');
	let newItemTeaser = $state('');
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<h1 class="text-2xl">
		{m.committeesAndAgendaItems()}
	</h1>

	{#each committees as committee}
		{@const agendaItems = committee.agendaItems}
		<div class="card bg-base-200 shadow-md">
			<div class="card-body">
				<h3 class="text-xl">{committee.abbreviation}</h3>
				{#each agendaItems as item}
					<div class="flex items-center gap-2 bg-base-200 p-2">
						<p>{item.name}</p>
						<button class="btn btn-ghost btn-error" aria-label="Delete">
							<i class="fa-duotone fa-x-mark"></i>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<div class="join join-vertical">
		<input class="input input-sm join-item input-bordered" />
		<input class="input input-sm join-item input-bordered" />
		<button class="btn btn-success join-item btn-sm" aria-label="Add Item">
			<i class="fa-duotone fa-plus"></i>
		</button>
	</div>
</div>
