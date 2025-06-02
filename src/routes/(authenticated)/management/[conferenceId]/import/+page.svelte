<script lang="ts">
	import { graphql } from '$houdini';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import ParticipantStatusWidgetBoolean from '$lib/components/ParticipantStatusWidgetBoolean.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { toast } from '@zerodevx/svelte-toast';
	import Section from '../helper/Section.svelte';
	import type { TableColumns } from 'svelte-table';
	import type { PageData } from './$houdini';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import { committee } from '$lib/paraglide/messages/en';

	// TODO we could improve this by defining and applying a ZOD schema
	// for this import

	interface CHASECommitteeMember {
		id: string;
		user:
			| {
					userEmail: string;
			  }
			| null
			| undefined;
		committeeId: string;
		representation: {
			id: string;
			alpha3Code?: string;
			alpha2Code?: string;
			faIcon?: string;
			type: 'DELEGATION' | 'NSA' | 'UN';
			name?: string;
		};
		presenceChangedTimestamps: {
			id: string;
			presentSetTo: boolean;
			timestamp: string;
		}[];
	}

	let { data }: { data: PageData } = $props();
	let committeesQuery = $derived(data.ImportGetCommittees);
	let loading = $state(false);
	let fileInput = $state<string>();
	let threshold = $state(20);
	let users = $derived.by(() => {
		if (!fileInput) return undefined;

		let parsedUsers = JSON.parse(fileInput) as CHASECommitteeMember[];
		parsedUsers = parsedUsers.filter((x) => x.presenceChangedTimestamps.length > 0);
		parsedUsers = parsedUsers.filter((x) => x.presenceChangedTimestamps.length > 0);
		parsedUsers = parsedUsers.filter((x) => x.user?.userEmail);
		let mappedUsers = parsedUsers.map((x) => ({
			email: x.user!.userEmail,
			representation: x.representation,
			committeeId: x.committeeId,
			attendancePercentage:
				(100 * x.presenceChangedTimestamps.filter((t) => t.presentSetTo).length) /
				x.presenceChangedTimestamps.length
		}));
		mappedUsers = mappedUsers.filter((x) => x.attendancePercentage >= threshold);

		return mappedUsers;
	});

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

	// TODO fetch user name from backend
	const columns: TableColumns<NonNullable<typeof users>[number]> = [
		{
			key: 'email',
			title: m.email(),
			value: (row) => row.email ?? 'N/A'
		},
		{
			key: 'role',
			title: m.role(),
			parseHTML: true,
			value: (row) => row.representation.alpha3Code ?? row.representation.name ?? 'N/A',
			renderValue: (row) =>
				row.representation.type === 'DELEGATION'
					? `<div class="w-[2rem] h-[1.5rem] rounded flex items-center justify-center overflow-hidden shadow bg-base-300 tooltip" data-tip="${row.representation.alpha2Code}"><span class="fi fi-${row.representation.alpha2Code} !w-full !leading-[100rem]"></span></div>`
					: row.representation.type === 'NSA' &&
						`<div class="w-[2rem] h-[1.5rem] rounded flex items-center justify-center overflow-hidden shadow bg-base-300 tooltip" data-tip="${row.representation.name}"><span class="fas fa-${row.representation?.faIcon?.replace('fa-', '')}"></span></div>`,
			sortable: true,
			class: 'text-center'
		},
		{
			key: 'committee',
			title: m.committee(),
			value: (row) =>
				$committeesQuery.data?.findManyCommittees.find((c) => c.id === row.committeeId)?.name ??
				'N/A'
		},
		{
			key: 'attendancePercentage',
			title: m.attendancePercentage(),
			value: (row) => `${Math.floor(row.attendancePercentage)}%`
		}
	];

	const updateParticipantAttendanceStatus = graphql(`
		mutation ImportUpdateParticipantAttendanceStatus(
			$conferenceId: ID!
			$didAttend: Boolean!
			$userEmail: ID!
		) {
			updateOneConferenceParticipantStatus(
				where: { conferenceId: $conferenceId, userEmail: $userEmail }
				data: { didAttend: $didAttend }
			) {
				id
				didAttend
			}
		}
	`);

	async function apply() {
		loading = true;
		if (!confirm(m.cannotBeUndone())) {
			return;
		}

		if (!users) return;

		await Promise.all(
			users.map(async (user) => {
				await updateParticipantAttendanceStatus.mutate({
					conferenceId: data.conferenceId,
					didAttend: true,
					userEmail: user.email
				});
			})
		);

		// if (!$updateImportedConferenceParticipantStatusQuery.errors) {
		//   toast.push(m.changesSuccessful(), {
		//     duration: 5000
		//   });
		loading = false;
	}

	// const switchAttendanceState = async (value: boolean) => {
	// 	await updateImportedConferenceParticipantStatusQuery.mutate({
	// 		conferenceId: data.conferenceId,
	// 		didAttend: value
	// 	});
	// 	}
	// };
</script>

<div class="flex w-full flex-col flex-wrap gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.import()}</h2>
		<p>{@html m.importDescription()}</p>
	</div>
	<Section title={m.importPresenceData()} description={m.importPresenceDataDescription()}>
		<input
			class="file-input file-input-bordered mt-4 w-full"
			type="file"
			accept=".json"
			onchange={(e) => setFileInput(e)}
		/>

		{#if users}
			<span class="my-2 flex">
				{m.threshold()}
				:<input
					class="range mx-2 w-44"
					type="range"
					min="0"
					max="100"
					bind:value={threshold}
					step="1"
				/>
				{threshold}%
			</span>
			<DataTable {columns} rows={users} enableSearch={true} tableClass="max-h-80" />

			<button class="btn btn-primary" onclick={apply}>
				{#if loading}
					<i class="fas fa-spinner fa-spin"></i>
				{:else}
					<i class="fas fa-save"></i>
				{/if}
				{m.save()}
			</button>
		{/if}
	</Section>
</div>
