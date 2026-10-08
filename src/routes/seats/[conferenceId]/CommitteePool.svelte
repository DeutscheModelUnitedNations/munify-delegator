<script lang="ts">
	import type { ConferenceSeats } from './conferenceSeats';
	import Drawer from '$lib/components/Drawer.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		committees: ConferenceSeats['committees'];
	}

	let { committees }: Props = $props();

	let agendaItems = $derived(committees.flatMap((c) => c.agendaItems));
	let drawerAgendaItem = $state<string>();
</script>

<table class="table">
	<thead>
		<tr>
			<th>
				<i class="fa-sharp-duotone fa-solid fa-text"></i>
			</th>
			<th>
				<i class="fa-sharp-duotone fa-solid fa-podium"></i>
			</th>
			<th class="text-center">
				<div class="tooltip" data-tip={m.nations()}>
					<i class="fa-sharp-duotone fa-solid fa-flag"></i>
				</div>
			</th>
			<th class="text-center">
				<div class="tooltip" data-tip={m.membersPerDelegation()}>
					<i class="fa-sharp-duotone fa-solid fa-users"></i>
				</div>
			</th>
			<th class="text-left">
				<i class="fa-sharp-duotone fa-solid fa-list-ol"></i>
			</th>
		</tr>
	</thead>
	<tbody>
		{#each committees as committee (committee.id)}
			<tr>
				<td>{committee.abbreviation}</td>
				<td>{committee.name}</td>
				<td class="text-center">{committee.nations.length}</td>
				<td class="text-center">{committee.numOfSeatsPerDelegation}</td>
				<td>
					<ul class="ml-4 list-disc">
						{#each committee.agendaItems as agendaItem (agendaItem.id)}
							<li class="list-item">
								{#if agendaItem.teaserText}
									<button class="btn-link" onclick={() => (drawerAgendaItem = agendaItem.id)}>
										{agendaItem.title}
									</button>
								{:else}
									{agendaItem.title}
								{/if}
							</li>
						{/each}
					</ul>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if agendaItems.length > 0}
	{@const agendaItem = drawerAgendaItem
		? agendaItems.find((a) => a.id === drawerAgendaItem)
		: undefined}
	<Drawer
		title={agendaItem?.title}
		open={!!agendaItem}
		loading={false}
		category={committees.find((c) => c.agendaItems.some((a) => a.id === agendaItem?.id))?.name ??
			''}
		onClose={() => (drawerAgendaItem = undefined)}
	>
		<p class="whitespace-pre-wrap">{agendaItem?.teaserText}</p>
	</Drawer>
{/if}
