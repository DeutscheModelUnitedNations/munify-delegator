<script lang="ts">
	import { graphql } from '$houdini';
	import Spinner from '$lib/components/Spinner.svelte';
	import * as m from '$lib/paraglide/messages';
	import type {
		Project,
		ProjectData
	} from '../../../../assignment-assistant/[projectId]/appData.svelte';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let query = $derived(data.BaseAssignmentDataQuery);
	let delegations = $derived($query.data?.findManyDelegations);
	let conference = $derived($query.data?.findUniqueConference);
	let singleParticipants = $derived($query.data?.findManySingleParticipants);

	let fileInput = $state<string>();

	const setFileInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result;
			if (typeof result === 'string') {
				fileInput = result;
			}
		};
		reader.readAsText(file);
	};

	const applyAssignment = async () => {
		if (!fileInput) return;
		const file = fileInput;
		const jsonData = JSON.parse(file);
		if (data.conferenceId !== jsonData.conference.id) {
			alert('File is from a different conference');
			return;
		}
		console.log(jsonData);
		sendAssignmentData(data.conferenceId, jsonData);
	};

	const sendAssigmentDataMutation = graphql(`
		mutation SendAssignmentDataMutation($where: ConferenceWhereUniqueInput!, $data: JSONObject!) {
			sendAssignmentData(data: $data, where: $where) {
				success
			}
		}
	`);

	export const sendAssignmentData = async (id: string, data: ProjectData) => {
		const req = await sendAssigmentDataMutation.mutate({
			where: { id },
			data
		});

		if (!req.data?.sendAssignmentData.success) {
			throw new Error('Failed to send assignment data');
		}
	};

	const downloadCurrentRegistrationData = () => {
		if (!conference || !delegations || !singleParticipants) return;
		const data: ProjectData = {
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
					{m.startAssignment()}
				</a>
				<i class="fa-duotone fa-3 text-3xl"></i>
				<input
					class="file-input file-input-bordered w-full"
					type="file"
					accept=".json"
					onchange={(e) => setFileInput(e)}
				/>
				<i class="fa-duotone fa-4 text-3xl"></i>
				<button
					class="btn btn-primary {!fileInput && 'btn-disabled'}"
					onclick={() => applyAssignment()}
				>
					<i class="fas fa-download"></i>
					{m.applyAssignment()}
				</button>
			</div>
		</div>
	</div>
{/if}
