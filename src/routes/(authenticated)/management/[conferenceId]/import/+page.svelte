<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import Section from '../helper/Section.svelte';
	import type { TableColumns } from 'svelte-table';
	import type { PageData } from './$houdini';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import { toast } from '@zerodevx/svelte-toast';
	import Modal from '$lib/components/Modal.svelte';
	import { getLocale } from '$lib/paraglide/runtime';

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
	let parsedUsers = $derived(
		fileInput ? (JSON.parse(fileInput) as CHASECommitteeMember[]) : undefined
	);
	let users = $derived.by(() => {
		if (!parsedUsers) return undefined;
		let processedUsers = parsedUsers.filter((x) => x.presenceChangedTimestamps.length > 0);
		processedUsers = processedUsers.filter((x) => x.presenceChangedTimestamps.length > 0);
		processedUsers = processedUsers.filter((x) => x.user?.userEmail);
		let mappedUsers = processedUsers.map((x) => ({
			email: x.user!.userEmail,
			representation: x.representation,
			committeeId: x.committeeId,
			attendancePercentage:
				(100 * x.presenceChangedTimestamps.filter((t) => t.presentSetTo).length) /
				x.presenceChangedTimestamps.length
		}));

		return mappedUsers;
	});
	let presentUsers = $derived(users?.filter((x) => x.attendancePercentage >= threshold));
	let absentUsers = $derived(users?.filter((x) => x.attendancePercentage < threshold));
	let selectedUser = $state<NonNullable<typeof presentUsers>[number] | undefined>(undefined);

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
	const columns: TableColumns<NonNullable<typeof presentUsers>[number]> = [
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
			value: (row) => row.attendancePercentage,
			renderValue: (row) => `${Math.floor(row.attendancePercentage)}%`,
			sortable: true
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

	async function applyPresent() {
		loading = true;
		if (!confirm(m.cannotBeUndone())) {
			return;
		}

		if (!presentUsers) return;

		await Promise.all(
			presentUsers.map(async (user) => {
				await updateParticipantAttendanceStatus.mutate({
					conferenceId: data.conferenceId,
					didAttend: true,
					userEmail: user.email
				});
			})
		);

		toast.push(m.changesSuccessful(), {
			duration: 5000
		});
		loading = false;
	}

	async function applyAbsent() {
		loading = true;
		if (!confirm(m.cannotBeUndone())) {
			return;
		}

		if (!presentUsers) return;

		await Promise.all(
			presentUsers.map(async (user) => {
				await updateParticipantAttendanceStatus.mutate({
					conferenceId: data.conferenceId,
					didAttend: false,
					userEmail: user.email
				});
			})
		);

		toast.push(m.changesSuccessful(), {
			duration: 5000
		});
		loading = false;
	}

	function selectUser(user) {
		selectedUser = user;
	}
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

		{#if presentUsers && absentUsers}
			<span class="my-6 flex">
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

			<h2 class="mt-4 text-2xl font-bold">
				{m.present()}: {presentUsers.length}
			</h2>
			<DataTable
				{columns}
				rows={presentUsers}
				enableSearch={true}
				tableClass="max-h-80"
				rowSelected={selectUser}
			/>
			<button class="btn btn-primary" onclick={applyPresent}>
				{#if loading}
					<i class="fas fa-spinner fa-spin"></i>
				{:else}
					<i class="fas fa-save"></i>
				{/if}
				{m.save()}
			</button>

			<h2 class="mt-2 text-2xl font-bold">
				{m.absent()}: {absentUsers.length}
			</h2>
			<DataTable
				{columns}
				rows={absentUsers}
				enableSearch={true}
				tableClass="max-h-80"
				rowSelected={selectUser}
			/>
			<button class="btn btn-primary" onclick={applyAbsent}>
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

{#snippet gotoUser()}
	<a
		href={`/management/${data.conferenceId}/participants?filter=${selectedUser?.email}`}
		target="_blank"
	>
		<button class="btn btn-primary">
			<i class="fas fa-arrow-up-right-from-square"></i>
			{selectedUser?.email}
		</button>
	</a>
{/snippet}

<Modal
	open={selectedUser !== undefined}
	action={gotoUser}
	onclose={() => {
		selectedUser = undefined;
	}}
>
	<table class="table">
		<thead>
			<tr>
				<th>{m.timestamp()}</th>
				<th>{m.attendanceStatus()}</th>
			</tr>
		</thead>
		<tbody>
			{#each parsedUsers
				?.find((u) => u.user?.userEmail === selectedUser?.email)
				?.presenceChangedTimestamps?.sort((a, b) => new Date(a!.timestamp).getTime() - new Date(b!.timestamp).getTime())! as timestamp}
				<tr>
					<td
						>{new Date(timestamp.timestamp).toLocaleDateString(getLocale()) +
							' ' +
							new Date(timestamp.timestamp).toLocaleTimeString(getLocale())}</td
					>
					<td>{timestamp.presentSetTo ? m.present() + ' ✅' : m.absent() + ' ❌'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</Modal>
