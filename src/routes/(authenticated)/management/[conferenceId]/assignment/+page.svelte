<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { page } from '$app/state';
	import Spinner from '$lib/components/Spinner.svelte';
	import { m } from '$lib/paraglide/messages';
	import { prettifyError } from 'zod';
	import {
		ProjectDataSchema,
		type ProjectData
	} from '../../../../(authenticated)/assignment-assistant/[projectId]/appData.svelte';
	import { fetchAssignmentProject } from './assignmentProject';

	const project = $derived(await fetchAssignmentProject(page.params.conferenceId!));
	const delegations = $derived(project.delegations);
	const conference = $derived(project.conference);
	const singleParticipants = $derived(project.singleParticipants);

	let fileInput = $state<string>();

	let validationError = $state<string>();

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

	$effect(() => {
		if (fileInput) {
			const parsed = ProjectDataSchema.safeParse(JSON.parse(fileInput));
			if (parsed.error) {
				validationError = prettifyError(parsed.error);
			}
		}
	});

	const applyAssignment = async () => {
		if (!fileInput) return;
		const file = fileInput;
		const jsonData = JSON.parse(file);
		if (page.params.conferenceId! !== jsonData.conference.id) {
			alert('File is from a different conference');
			return;
		}
		sendAssignmentData(page.params.conferenceId!, jsonData);
	};

	const sendAssignmentData = async (conferenceId: string, projectData: ProjectData) => {
		const applied = await client.mutate.sendAssignmentData({
			__args: { conferenceId, data: projectData }
		});

		if (!applied) {
			alert('Failed to send assignment data');
			throw new Error('Failed to send assignment data');
		}

		alert('Assignment data successfully applied');
	};

	const downloadCurrentRegistrationData = () => {
		if (!conference || !delegations || !singleParticipants) return;
		// The project file's schema distinguishes delegations from single participants by which
		// keys are absent, so the discriminating keys are spelled out here.
		const data: ProjectData = {
			conference,
			delegations: delegations.map((delegation) => ({
				id: delegation.id,
				school: delegation.school ?? undefined,
				appliedForRoles: delegation.appliedForRoles.map((role) => ({
					id: role.id,
					rank: role.rank,
					nation: role.nation ?? undefined,
					nonStateActor: role.nonStateActor ?? undefined,
					fontAwesomeIcon: undefined,
					name: undefined
				})),
				members: delegation.members.map((member) => ({
					id: member.id,
					isHeadDelegate: member.isHeadDelegate,
					user: member.user,
					supervisors: member.supervisors.map((supervisor) => ({
						id: supervisor.id,
						user: supervisor.user
					}))
				})),
				supervisors: undefined,
				user: undefined
			})),
			singleParticipants: singleParticipants.map((participant) => ({
				id: participant.id,
				school: participant.school ?? undefined,
				user: participant.user,
				appliedForRoles: participant.appliedForRoles.map((role) => ({
					id: role.id,
					name: role.name,
					fontAwesomeIcon: role.fontAwesomeIcon,
					rank: undefined,
					nation: undefined,
					nonStateActor: undefined
				})),
				supervisors: participant.supervisors.map((supervisor) => ({
					id: supervisor.id,
					user: supervisor.user
				})),
				members: undefined,
				splittedFrom: undefined,
				splittedInto: undefined
			}))
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

{#if !conference}
	<Spinner />
{:else}
	<div class="flex flex-col gap-8 p-10">
		<div class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">{m.adminAssignment()}</h2>
			<p>{@html m.adminAssignmentDescription()}</p>

			<div class="mt-10 grid grid-cols-[auto_1fr] items-center justify-center gap-6">
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
					class="file-input w-full"
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

			<pre class="mt-4 break-all whitespace-pre-wrap text-red-600">{validationError}</pre>
		</div>
	</div>
{/if}
