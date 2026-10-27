<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { readSelectedTextFile } from '#lib/helpers/readSelectedTextFile.js';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import Section from '../helper/Section.svelte';
	import { renderComponent } from '#lib/components/tanStackTable/index.js';
	import type { ManagedColumn } from '#lib/components/tanStackTable/managedTable.js';
	import ManagedTable from '#lib/components/tanStackTable/ui/ManagedTable.svelte';
	import RepresentationBadge from './RepresentationBadge.svelte';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import {
		parsePresenceExport,
		representationLabel,
		scoreDelegates,
		scoreNsas,
		type ScoredDelegate,
		type ScoredNsa
	} from './presenceImport';
	import type { ChasePresenceRepresentation } from '#lib/schemata/chasePresence.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			name: true
		})
	);
	let loading = $state(false);
	let fileInput = $state<string>();
	let delegateThreshold = $state(20);
	let nsaMinCheckIns = $state(3);

	let parsed = $derived(fileInput === undefined ? undefined : parsePresenceExport(fileInput));
	let participants = $derived(parsed?.ok ? parsed.data.participants : undefined);

	let delegates = $derived(participants && scoreDelegates(participants, delegateThreshold));
	let presentDelegates = $derived(delegates?.filter((d) => d.attended));
	let absentDelegates = $derived(delegates?.filter((d) => !d.attended));

	let nsas = $derived(participants && scoreNsas(participants, nsaMinCheckIns));
	let presentNsas = $derived(nsas?.filter((n) => n.attended));
	let absentNsas = $derived(nsas?.filter((n) => !n.attended));

	let selectedEmail = $state<string | undefined>(undefined);
	let selectedEvents = $derived(
		[...(participants?.find((p) => p.email === selectedEmail)?.events ?? [])].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		)
	);

	const committeeName = (id: string | null) => committees.find((c) => c.id === id)?.name ?? 'N/A';

	const setFileInput = (e: Event) =>
		readSelectedTextFile(e, (text) => {
			fileInput = text;
		});

	const roleColumn = <T extends { representation: ChasePresenceRepresentation | null }>() =>
		({
			id: 'role',
			header: m.role(),
			accessorFn: (row) => representationLabel(row.representation),
			cell: ({ row }) =>
				row.original.representation
					? renderComponent(RepresentationBadge, { representation: row.original.representation })
					: 'N/A'
		}) satisfies ManagedColumn<T>;

	// TODO fetch user name from backend
	const delegateColumns: ManagedColumn<ScoredDelegate>[] = [
		{ id: 'email', header: m.email(), accessorFn: (row) => row.email },
		roleColumn<ScoredDelegate>(),
		{
			id: 'committee',
			header: m.committee(),
			accessorFn: (row) => committeeName(row.committeeId)
		},
		{
			id: 'attendancePercentage',
			header: m.attendancePercentage(),
			accessorFn: (row) => row.attendancePercentage,
			cell: ({ row }) => `${Math.floor(row.original.attendancePercentage)}%`
		}
	];

	const nsaColumns: ManagedColumn<ScoredNsa>[] = [
		{ id: 'email', header: m.email(), accessorFn: (row) => row.email },
		roleColumn<ScoredNsa>(),
		{ id: 'checkIns', header: m.checkIns(), accessorFn: (row) => row.checkIns }
	];

	const columnClasses = { role: 'text-center' };

	async function apply(rows: { email: string }[] | undefined, didAttend: boolean) {
		if (!rows) return;
		if (!(await confirmDialog({ text: m.cannotBeUndone(), danger: true }))) return;
		loading = true;
		try {
			await Promise.all(
				rows.map((row) =>
					client.mutate.updateConferenceParticipant({
						__args: { conferenceId, didAttend, userEmail: row.email },
						id: true,
						didAttend: true
					})
				)
			);
			toast.success(m.changesSuccessful());
		} finally {
			loading = false;
		}
	}

	const selectRow = (row: { email: string }) => (selectedEmail = row.email);
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
		{#if parsed && !parsed.ok}
			<div class="alert alert-error mt-4">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
				<span>{m.importPresenceInvalidFile()}</span>
			</div>
		{/if}
	</Section>

	{#if presentDelegates && absentDelegates}
		<Section
			title={m.importPresenceDelegates()}
			description={m.importPresenceDelegatesDescription()}
		>
			<label class="my-4 flex items-center">
				{m.threshold()}:
				<input
					class="range mx-2 w-44"
					type="range"
					min="0"
					max="100"
					bind:value={delegateThreshold}
					step="1"
				/>
				{delegateThreshold}%
			</label>
			{@render resultTables('delegate', presentDelegates, absentDelegates, delegateColumns)}
		</Section>
	{/if}

	{#if presentNsas && absentNsas}
		<Section title={m.nonStateActors()} description={m.importPresenceNsasDescription()}>
			<label class="my-4 flex items-center gap-2">
				{m.importPresenceMinCheckIns()}:
				<input
					class="input input-sm w-24"
					type="number"
					min="0"
					step="1"
					bind:value={nsaMinCheckIns}
				/>
			</label>
			{@render resultTables('nsa', presentNsas, absentNsas, nsaColumns)}
		</Section>
	{/if}
</div>

{#snippet resultTables<T extends { email: string }>(
	key: string,
	present: T[],
	absent: T[],
	columns: ManagedColumn<T>[]
)}
	<h2 class="mt-4 text-2xl font-bold">{m.present()}: {present.length}</h2>
	<ManagedTable
		{columns}
		rows={present}
		{columnClasses}
		onRowClick={selectRow}
		queryParamKey="{key}PresentFilter"
	/>
	<button class="btn btn-primary" disabled={loading} onclick={() => apply(present, true)}>
		{@render saveIcon()}
		{m.save()}
	</button>

	<h2 class="mt-2 text-2xl font-bold">{m.absent()}: {absent.length}</h2>
	<ManagedTable
		{columns}
		rows={absent}
		{columnClasses}
		onRowClick={selectRow}
		queryParamKey="{key}AbsentFilter"
	/>
	<button class="btn btn-primary" disabled={loading} onclick={() => apply(absent, false)}>
		{@render saveIcon()}
		{m.save()}
	</button>
{/snippet}

{#snippet saveIcon()}
	{#if loading}
		<i class="fas fa-spinner fa-spin"></i>
	{:else}
		<i class="fas fa-save"></i>
	{/if}
{/snippet}

{#snippet gotoUser()}
	<a
		href={resolve(`dashboard/${conferenceId}/team/participants?selected=${selectedEmail}`)}
		target="_blank"
	>
		<button class="btn btn-primary">
			<i class="fas fa-arrow-up-right-from-square"></i>
			{selectedEmail}
		</button>
	</a>
{/snippet}

<Modal
	open={selectedEmail !== undefined}
	action={gotoUser}
	onclose={() => {
		selectedEmail = undefined;
	}}
>
	<table class="table">
		<thead>
			<tr>
				<th>{m.timestamp()}</th>
				<th>{m.committee()}</th>
				<th>{m.attendanceStatus()}</th>
			</tr>
		</thead>
		<tbody>
			{#each selectedEvents as event (event.id)}
				<tr>
					<td
						>{new Date(event.timestamp).toLocaleDateString(getLocale()) +
							' ' +
							new Date(event.timestamp).toLocaleTimeString(getLocale())}</td
					>
					<td>{committeeName(event.committeeId)}</td>
					<td>{event.present ? m.present() + ' ✅' : m.absent() + ' ❌'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</Modal>
