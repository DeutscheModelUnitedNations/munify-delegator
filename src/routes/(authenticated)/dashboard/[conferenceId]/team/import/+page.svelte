<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { readSelectedTextFile } from '#lib/helpers/readSelectedTextFile';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Section from '../helper/Section.svelte';
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { createLocalSource, type GridSource } from '#lib/components/dataGrid/dataSource';
	import { cellOf, type GridColumn } from '#lib/components/dataGrid/gridColumn';
	import RepresentationBadge from './RepresentationBadge.svelte';
	import ChasePresenceNotice from './ChasePresenceNotice.svelte';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { getLocale } from '#lib/paraglide/runtime';
	import {
		parsePresenceExport,
		representationLabel,
		scoreDelegates,
		scoreNsas,
		type ScoredDelegate,
		type ScoredNsa
	} from './presenceImport';
	import {
		CHASE_PRESENCE_SCHEMA_URL,
		parseLinkedPresence,
		type ChasePresenceRepresentation
	} from '#lib/schemata/chasePresence';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import type { PageProps } from './$types';
	import { untrack } from 'svelte';

	let { params }: PageProps = $props();
	// read once: the page's boundary is keyed by its path (see "Route parameters" in CLAUDE.md)
	const conferenceId = untrack(() => params.conferenceId);

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

	// While linked, the page asks CHASE for its records when it opens and on "read again"
	// (`docs/plans/chase-link.md`); nothing of them is kept here. A file uploaded below still wins,
	// for a conference that ran on another CHASE.
	const chaseLink = $derived(await fetchActiveChaseLink());
	const linked = $derived(chaseLink !== undefined);
	let chaseReads = $state(0);

	/** CHASE's presence now, `failed` when CHASE could not be asked. */
	async function readChasePresence() {
		try {
			const data = await client.query.chasePresence({
				__args: { conferenceId },
				exportedAt: true,
				conferenceId: true,
				participants: {
					email: true,
					kind: true,
					committeeId: true,
					representation: {
						type: true,
						alpha2Code: true,
						alpha3Code: true,
						icon: true,
						name: true
					},
					events: { committeeId: true, present: true, type: true, timestamp: true }
				}
			});
			const presence =
				data &&
				parseLinkedPresence({
					$schema: CHASE_PRESENCE_SCHEMA_URL,
					exportedAt: data.exportedAt,
					conferenceId: data.conferenceId,
					participants: data.participants
				});
			return { failed: false, presence: presence ?? undefined };
		} catch {
			return { failed: true, presence: undefined };
		}
	}
	// `chaseReads` counts the "read again" clicks, each of which asks CHASE anew
	const chaseRead = $derived(
		linked && chaseReads >= 0 ? await readChasePresence() : { failed: false, presence: undefined }
	);
	const fromChase = $derived(chaseRead.presence);

	let participants = $derived(
		parsed?.ok
			? parsed.data.participants
			: fromChase?.success
				? fromChase.data.participants
				: undefined
	);

	let delegates = $derived(
		participants && scoreDelegates({ participants, thresholdPercent: delegateThreshold })
	);
	let presentDelegates = $derived(delegates?.filter((d) => d.attended));
	let absentDelegates = $derived(delegates?.filter((d) => !d.attended));

	let nsas = $derived(participants && scoreNsas({ participants, minCheckIns: nsaMinCheckIns }));
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
		readSelectedTextFile({
			e,
			onText: (text) => {
				fileInput = text;
			}
		});

	const roleColumn = <
		T extends { representation: ChasePresenceRepresentation | null }
	>(): GridColumn<T> => ({
		id: 'role',
		type: 'text',
		label: m.role(),
		align: 'center',
		value: (row) => representationLabel(row.representation),
		cell: (row) =>
			row.representation
				? cellOf({ component: RepresentationBadge, props: { representation: row.representation } })
				: undefined
	});

	// TODO fetch user name from backend
	const delegateColumns: GridColumn<ScoredDelegate>[] = [
		{
			id: 'email',
			type: 'text',
			label: m.email(),
			alwaysVisible: true,
			size: 260,
			value: (row) => row.email
		},
		roleColumn<ScoredDelegate>(),
		{
			id: 'committee',
			type: 'text',
			label: m.committee(),
			value: (row) => committeeName(row.committeeId)
		},
		{
			id: 'attendancePercentage',
			type: 'number',
			label: m.attendancePercentage(),
			align: 'right',
			value: (row) => row.attendancePercentage,
			text: (row) => `${Math.floor(row.attendancePercentage)}%`
		}
	];

	const nsaColumns: GridColumn<ScoredNsa>[] = [
		{
			id: 'email',
			type: 'text',
			label: m.email(),
			alwaysVisible: true,
			size: 260,
			value: (row) => row.email
		},
		roleColumn<ScoredNsa>(),
		{
			id: 'checkIns',
			type: 'number',
			label: m.checkIns(),
			align: 'right',
			value: (row) => row.checkIns
		}
	];

	const sources = {
		delegatePresent: createLocalSource({
			rows: () => presentDelegates ?? [],
			columns: () => delegateColumns
		}),
		delegateAbsent: createLocalSource({
			rows: () => absentDelegates ?? [],
			columns: () => delegateColumns
		}),
		nsaPresent: createLocalSource({ rows: () => presentNsas ?? [], columns: () => nsaColumns }),
		nsaAbsent: createLocalSource({ rows: () => absentNsas ?? [], columns: () => nsaColumns })
	};

	async function apply({
		rows,
		didAttend
	}: {
		rows: { email: string }[] | undefined;
		didAttend: boolean;
	}) {
		if (!rows) return;
		if (!(await confirmDialog({ text: m.cannotBeUndone(), danger: true }))) return;
		loading = true;
		try {
			await Promise.all(
				rows.map((row) =>
					client.mutate.upsertConferenceParticipant({
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

<div class="flex w-full flex-col flex-wrap gap-8 py-4 sm:p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.importDescription()}</p>
	</div>
	<Section title={m.importPresenceData()} description={m.importPresenceDataDescription()}>
		{#if chaseLink}
			<ChasePresenceNotice
				fromFile={!!parsed?.ok}
				failed={chaseRead.failed}
				readAt={fromChase?.success && fromChase.data.participants.length > 0
					? fromChase.data.exportedAt
					: undefined}
				onReadAgain={() => (chaseReads += 1)}
			/>
		{/if}
		{#if chaseLink}
			<details class="mt-4">
				<summary class="cursor-pointer">{m.importPresenceFromFile()}</summary>
				{@render fileInputField()}
			</details>
		{:else}
			{@render fileInputField()}
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
					class="range mx-2 w-44 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"
					type="range"
					min="0"
					max="100"
					bind:value={delegateThreshold}
					step="1"
				/>
				{delegateThreshold}%
			</label>
			{@render resultTables({
				key: 'delegate',
				present: presentDelegates,
				absent: absentDelegates,
				columns: delegateColumns,
				presentSource: sources.delegatePresent,
				absentSource: sources.delegateAbsent
			})}
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
			{@render resultTables({
				key: 'nsa',
				present: presentNsas,
				absent: absentNsas,
				columns: nsaColumns,
				presentSource: sources.nsaPresent,
				absentSource: sources.nsaAbsent
			})}
		</Section>
	{/if}
</div>

{#snippet resultTables<T extends { email: string }>({
	key,
	present,
	absent,
	columns,
	presentSource,
	absentSource
}: {
	key: string;
	present: T[];
	absent: T[];
	columns: GridColumn<T>[];
	presentSource: GridSource<T>;
	absentSource: GridSource<T>;
})}
	<h2 class="mt-4 text-2xl font-bold">{m.present()}: {present.length}</h2>
	<DataGrid
		{columns}
		source={presentSource}
		rowId={(row) => row.email}
		label={m.present()}
		exportName="{key}-present"
		onRowClick={selectRow}
		urlPrefix="{key}Present-"
	/>
	<button
		class="btn btn-primary"
		disabled={loading}
		onclick={() => apply({ rows: present, didAttend: true })}
	>
		{@render saveIcon()}
		{m.save()}
	</button>

	<h2 class="mt-2 text-2xl font-bold">{m.absent()}: {absent.length}</h2>
	<DataGrid
		{columns}
		source={absentSource}
		rowId={(row) => row.email}
		label={m.absent()}
		exportName="{key}-absent"
		onRowClick={selectRow}
		urlPrefix="{key}Absent-"
	/>
	<button
		class="btn btn-primary"
		disabled={loading}
		onclick={() => apply({ rows: absent, didAttend: false })}
	>
		{@render saveIcon()}
		{m.save()}
	</button>
{/snippet}

{#snippet fileInputField()}
	<input
		class="file-input mt-4 w-full"
		type="file"
		accept=".json"
		onchange={(e) => setFileInput(e)}
	/>
	{#if parsed && !parsed.ok}
		<div class="alert alert-error mt-4">
			<i aria-hidden="true" class="ph-duotone ph-warning"></i>
			<span>{m.importPresenceInvalidFile()}</span>
		</div>
	{/if}
{/snippet}

{#snippet saveIcon()}
	{#if loading}
		<i aria-hidden="true" class="ph-fill ph-spinner-gap animate-spin"></i>
	{:else}
		<i aria-hidden="true" class="ph-fill ph-floppy-disk"></i>
	{/if}
{/snippet}

{#snippet gotoUser()}
	<a
		href={resolve(`dashboard/${conferenceId}/team/participants?selected=${selectedEmail}`)}
		target="_blank"
		class="min-w-0"
	>
		<button class="btn btn-primary max-w-full">
			<i aria-hidden="true" class="ph-fill ph-arrow-square-out"></i>
			<span class="truncate">{selectedEmail}</span>
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
	<div class="overflow-x-auto">
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
	</div>
</Modal>
