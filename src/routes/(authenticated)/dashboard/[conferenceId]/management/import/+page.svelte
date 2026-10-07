<script lang="ts">
	import { readSelectedTextFile } from '$lib/helpers/readSelectedTextFile';
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import Section from '../helper/Section.svelte';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import RepresentationBadge from './RepresentationBadge.svelte';
	import { toast } from 'svelte-sonner';
	import Modal from '$lib/components/Modal.svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

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

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: params.conferenceId } } },
			id: true,
			name: true
		})
	);
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
	let selectedUserTimestamps = $derived(
		[
			...(parsedUsers?.find((u) => u.user?.userEmail === selectedUser?.email)
				?.presenceChangedTimestamps ?? [])
		].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
	);

	const setFileInput = (e: Event) =>
		readSelectedTextFile(e, (text) => {
			fileInput = text;
		});

	// TODO fetch user name from backend
	const columns: ManagedColumn<NonNullable<typeof presentUsers>[number]>[] = [
		{
			id: 'email',
			header: m.email(),
			accessorFn: (row) => row.email ?? 'N/A'
		},
		{
			id: 'role',
			header: m.role(),
			accessorFn: (row) => row.representation.alpha3Code ?? row.representation.name ?? 'N/A',
			cell: ({ row }) =>
				renderComponent(RepresentationBadge, { representation: row.original.representation })
		},
		{
			id: 'committee',
			header: m.committee(),
			accessorFn: (row) => committees.find((c) => c.id === row.committeeId)?.name ?? 'N/A'
		},
		{
			id: 'attendancePercentage',
			header: m.attendancePercentage(),
			accessorFn: (row) => row.attendancePercentage,
			cell: ({ row }) => `${Math.floor(row.original.attendancePercentage)}%`
		}
	];

	const columnClasses = { role: 'text-center' };

	async function applyPresent() {
		loading = true;
		if (!confirm(m.cannotBeUndone())) {
			return;
		}

		if (!presentUsers) return;

		await Promise.all(
			presentUsers.map(async (user) => {
				await client.mutate.updateConferenceParticipantStatus({
					__args: {
						conferenceId: params.conferenceId,
						didAttend: true,
						userEmail: user.email
					},
					id: true,
					didAttend: true
				});
			})
		);

		toast.success(m.changesSuccessful());
		loading = false;
	}

	async function applyAbsent() {
		loading = true;
		if (!confirm(m.cannotBeUndone())) {
			return;
		}

		if (!absentUsers) return;

		await Promise.all(
			absentUsers.map(async (user) => {
				await client.mutate.updateConferenceParticipantStatus({
					__args: {
						conferenceId: params.conferenceId,
						didAttend: false,
						userEmail: user.email
					},
					id: true,
					didAttend: true
				});
			})
		);

		toast.success(m.changesSuccessful());
		loading = false;
	}

	function selectUser(user: NonNullable<typeof presentUsers>[number]) {
		selectedUser = user;
	}
</script>

<div class="flex w-full flex-col flex-wrap gap-8 p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.importDescription()}</p>
	</div>
	<Section title={m.importPresenceData()} description={m.importPresenceDataDescription()}>
		<input
			class="file-input mt-4 w-full"
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
			<ManagedTable
				{columns}
				rows={presentUsers}
				{columnClasses}
				onRowClick={selectUser}
				queryParamKey="presentFilter"
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
			<ManagedTable
				{columns}
				rows={absentUsers}
				{columnClasses}
				onRowClick={selectUser}
				queryParamKey="absentFilter"
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
		href={resolve(
			`/dashboard/${params.conferenceId}/management/participants?selected=${selectedUser?.email}`
		)}
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
			{#each selectedUserTimestamps as timestamp (timestamp.id)}
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
