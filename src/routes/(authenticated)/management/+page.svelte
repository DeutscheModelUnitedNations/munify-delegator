<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { conferences } = $derived(data);
</script>

<div class="flex w-full flex-col items-center gap-4 p-10">
	<h1 class="text-2xl font-bold">{m.admininstration()}</h1>
	<p class="text-center max-ch-md">
		{m.administrationConferenceSelection()}
	</p>
	<div class="flex justify-center">
		{#if conferences && conferences.length > 0}
			<table class="table">
				<thead>
					<tr>
						<th>{m.name()}</th>
						<th>{m.authorization()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each conferences as conference}
						<tr>
							<td>{conference.title}</td>
							<td>{conference.myMembership}</td>
							<td>
								<a class="btn" href={`management/${conference.id}`}
									>{m.open()}<i class="fa-duotone fa-arrow-right"></i></a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			{m.noResults()}
		{/if}
	</div>
	<a class="btn" href="/management/create-conference">
		<i class="fa-solid fa-plus"></i>
		{m.createNewConference()}
	</a>
</div>
