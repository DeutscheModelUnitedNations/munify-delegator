<script lang="ts">
	import type { PageData } from './$houdini';
	import * as m from '$lib/paraglide/messages';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let ConferenceRolesQueryForIframe = $derived(data.ConferenceRolesQueryForIframe);
	let conference = $derived($ConferenceRolesQueryForIframe.data?.findUniqueConference);
	let committees = $derived($ConferenceRolesQueryForIframe.data?.findManyCommittees ?? []);
	let nations = $derived($ConferenceRolesQueryForIframe.data?.findManyNations ?? []);
	let nonStateActors = $derived($ConferenceRolesQueryForIframe.data?.findManyNonStateActors ?? []);
	let customConferenceRoles = $derived(
		$ConferenceRolesQueryForIframe.data?.findManyCustomConferenceRoles ?? []
	);
</script>

<div class="flex w-full flex-col gap-4 p-4">
	{#if conference}
		<div>
			<h1 class="text-4xl font-bold">{m.roleOverview()}</h1>
			<h3 class="text-xl">{conference.title}</h3>
			<h3 class="text-xl font-thin">
				{conference.startConference.toLocaleDateString()} - {conference.endConference.toLocaleDateString()}
			</h3>
		</div>
		<div class="flex flex-col gap-4 rounded-xl bg-base-200 p-4">
			<h3 class="text-xl">{m.nsaPool()}</h3>
			<div class="flex flex-wrap gap-4">
				{#each nonStateActors as nsa}
					<div class="flex items-center gap-4 rounded-xl bg-base-100 p-4 shadow-sm">
						<Flag nsa icon={nsa.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
						{nsa.name}
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-4 rounded-xl bg-base-200 p-4">
			<h3 class="text-xl">{m.otherRoles()}</h3>
			<div class="flex flex-wrap gap-4">
				{#each customConferenceRoles as role}
					<div class="flex items-center gap-4 rounded-xl bg-base-100 p-4 shadow-sm">
						<Flag nsa icon={role.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
						{role.name}
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-4 rounded-xl bg-base-200 p-4">
			<h3 class="text-xl">{m.nationsPool()}</h3>
			<table class="table table-pin-rows bg-base-100 text-center">
				<thead>
					<tr class="">
						<th><i class="fa-duotone fa-flag"></i></th>
						{#each committees as committee}
							<th>
								<div class="tooltip" data-tip={committee.name}>
									{committee.abbreviation}
								</div>
							</th>
						{/each}
						<th><i class="fa-duotone fa-sigma"></i></th>
					</tr>
				</thead>
				<tbody>
					{#each nations as nation}
						<tr>
							<td>
								<div
									class="tooltip flex flex-col items-center"
									data-tip={getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
								>
									<Flag alpha2Code={nation.alpha2Code} size="xs" />
									<div class="uppercase">{nation.alpha3Code}</div>
								</div>
							</td>
							{#each committees as committee}
								{@const seats =
									nation.committees.find((c) => c.id === committee.id)?.numOfSeatsPerDelegation ??
									0}
								<td>
									{#if seats > 0}
										{#each Array(seats) as _}
											<i class="fa-duotone fa-xmark text-xl"></i>
										{/each}
									{/if}
								</td>
							{/each}
							<td>
								{#if nation.committees.length > 0}
									{nation.committees.reduce((acc, c) => {
										if (committees.flatMap((c) => c.id).includes(c.id)) {
											return acc + c.numOfSeatsPerDelegation;
										}
										return acc;
									}, 0)}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
