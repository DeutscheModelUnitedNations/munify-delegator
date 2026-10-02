<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import CommitteeAgendaEditor from '../CommitteeAgendaEditor.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<h1 class="text-2xl">
		{m.committeesAndAgendaItems()}
	</h1>

	<CommitteeAgendaEditor conferenceId={params.conferenceId} />
</div>
