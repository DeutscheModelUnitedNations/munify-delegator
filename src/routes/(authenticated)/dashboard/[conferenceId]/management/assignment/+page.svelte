<script lang="ts">
	import { readSelectedTextFile } from '$lib/helpers/readSelectedTextFile';
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { prettifyError } from 'zod';
	import {
		ProjectDataSchema,
		type ProjectData
	} from '../../../../assignment-assistant/[projectId]/appData.svelte';
	import { fetchAssignmentProject } from './assignmentProject';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let downloading = $state(false);

	let fileInput = $state<string>();

	let validationError = $state<string>();

	const setFileInput = (e: Event) =>
		readSelectedTextFile(e, (text) => {
			fileInput = text;
		});

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
		if (params.conferenceId !== jsonData.conference.id) {
			alert('File is from a different conference');
			return;
		}
		sendAssignmentData(params.conferenceId, jsonData);
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

	const downloadCurrentRegistrationData = async () => {
		downloading = true;
		try {
			await downloadProjectFile();
		} finally {
			downloading = false;
		}
	};

	const downloadProjectFile = async () => {
		const { conference, delegations, singleParticipants } = await fetchAssignmentProject(
			params.conferenceId
		);
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
		a.download = `registration-data_${conference.title.replace(' ', '-')}_${new Date().toISOString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.adminAssignmentDescription()}</p>

		<div class="mt-10 grid grid-cols-[auto_1fr] items-center justify-center gap-6">
			<i class="fa-duotone fa-1 text-3xl"></i>
			<button
				class="btn btn-primary"
				onclick={() => downloadCurrentRegistrationData()}
				disabled={downloading}
			>
				{#if downloading}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<i class="fas fa-download"></i>
				{/if}
				{m.downloadCurrentRegistrationData()}
			</button>
			<i class="fa-duotone fa-2 text-3xl"></i>
			<a class="btn btn-primary" href={resolve('/assignment-assistant')}>
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
