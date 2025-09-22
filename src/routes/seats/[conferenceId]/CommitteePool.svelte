<script lang="ts">
	import type { SeatsOfConferenceQuery$result } from '$houdini';
	import Drawer from '$lib/components/Drawer.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		committees: NonNullable<SeatsOfConferenceQuery$result['findUniqueConference']>['committees'];
	}

	let { committees }: Props = $props();

	let agendaItems = $derived(committees.flatMap((c) => c.agendaItems));
	let drawerAgendaItem = $state<string>();
</script>

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
			<th>
				<i class="fa-duotone fa-list-ol"></i>
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
				<td>
					<ul class="list-disc">
						{#each committee.agendaItems as agendaItem}
							<button
								class="btn btn-link list-item"
								onclick={() => (drawerAgendaItem = agendaItem.id)}
							>
								{agendaItem.title}
							</button>
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
