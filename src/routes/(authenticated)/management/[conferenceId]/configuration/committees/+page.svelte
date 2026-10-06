<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { canConfigureCommittees } from '$lib/services/managementAccess';
	import type { PageData } from './$houdini';
	import CommitteesManager from './CommitteesManager.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<h1 class="text-2xl">
		{m.committeesAndAgendaItems()}
	</h1>

	<CommitteesManager
		conferenceId={data.conferenceId}
		committees={data.data.findManyCommittees}
		canConfigure={canConfigureCommittees(data.myMembership)}
		agendaItemForm={data.addAgendaItemForm}
	/>
</div>
