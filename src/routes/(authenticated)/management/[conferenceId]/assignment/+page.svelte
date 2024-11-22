<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { RegistrationData } from '../../../../assignment-assistant/data';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let query = $derived(data.BaseAssignmentDataQuery);
	let delegations = $derived($query.data?.findManyDelegations);
	let conference = $derived($query.data?.findUniqueConference);
	let singleParticipants = $derived($query.data?.findManySingleParticipants);

	const downloadCurrentRegistrationData = () => {
		if (!conference || !delegations || !singleParticipants) return;
		const data: RegistrationData = {
			conference,
			delegations,
			singleParticipants
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `registration-data_${conference?.title.replace(' ', '-')}_${new Date().toISOString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

{#if $query.fetching}
	<Spinner />
{:else}
	<div class="flex flex-col gap-8 p-10">
		<div class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">{m.adminAssignment()}</h2>
			<p>{@html m.adminAssignmentDescription()}</p>

			<div class="mt-10 grid grid-cols-[auto,1fr] items-center justify-center gap-6">
				<i class="fa-duotone fa-1 text-3xl"></i>
				<button class="btn btn-primary" onclick={() => downloadCurrentRegistrationData()}>
					<i class="fas fa-download"></i>
					{m.downloadCurrentRegistrationData()}
				</button>
				<i class="fa-duotone fa-2 text-3xl"></i>
				<a class="btn btn-primary" href="/assignment-assistant">
					<i class="fas fa-arrow-right"></i>
					{m.startAssistant()}
				</a>
			</div>
		</div>
	</div>
{/if}
