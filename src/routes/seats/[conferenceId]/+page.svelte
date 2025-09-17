<script lang="ts">
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import NationPool from '$lib/components/NationPool.svelte';
	import NsaPool from '$lib/components/NSAPool.svelte';
	import { getUniqueNations } from '$lib/services/getUniqueNations';
	import { m } from '$lib/paraglide/messages';

	let { data }: { data: PageData } = $props();
	const conferenceQuery = $derived(data.SeatsOfConferenceQuery);
	const conference = $derived($conferenceQuery.data.findUniqueConference);
	const { nonStateActors: nonStateActorPool, committees } = $derived(conference);

	const nationPool = $derived(getUniqueNations(committees));
</script>

<div class="flex w-full flex-col items-center bg-base-200 p-4 md:p-10">
	<div class="flex w-full max-w-6xl flex-col items-center gap-10">
		<div class="text-center">
			<h1 class="text-5xl font-bold">
				{conference.title}
			</h1>

			<h2 class="mt-4 text-2xl">
				{m.conferenceSeats()}
			</h2>
		</div>

		<div class="collapse collapse-arrow w-full bg-base-100 shadow-lg">
			<input type="checkbox" />
			<div class="collapse-title text-xl font-medium">{m.committees()}</div>
			<div class="collapse-content w-full overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>
								<i class="fa-duotone fa-text"></i>
							</th>
							<th>
								<i class="fa-duotone fa-podium"></i>
							</th>
							<th>
								<div class="tooltip" data-tip={m.nations()}>
									<i class="fa-duotone fa-flag"></i>
								</div>
							</th>
							<th>
								<div class="tooltip" data-tip={m.membersPerDelegation()}>
									<i class="fa-duotone fa-users"></i>
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each committees as committee}
							<tr>
								<td>{committee.abbreviation}</td>
								<td>{committee.name}</td>
								<td>{committee.nations.length}</td>
								<td>{committee.numOfSeatsPerDelegation}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="collapse collapse-arrow w-full bg-base-100 shadow-lg">
			<input type="checkbox" />
			<div class="collapse-title text-xl font-medium">{m.nationsPool()}</div>
			<div class="collapse-content w-full overflow-x-auto">
				<NationPool {committees} {nationPool} />
			</div>
		</div>

		<div class="collapse collapse-arrow w-full bg-base-100 shadow-lg">
			<input type="checkbox" />
			<div class="collapse-title text-xl font-medium">{m.nsaPool()}</div>
			<div class="collapse-content w-full overflow-x-auto">
				<NsaPool {nonStateActorPool} />
			</div>
		</div>
	</div>
</div>
