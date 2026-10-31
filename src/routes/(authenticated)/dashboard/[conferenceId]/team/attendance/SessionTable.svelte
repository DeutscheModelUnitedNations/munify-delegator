<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { toast } from 'svelte-sonner';
	import type { Snippet } from 'svelte';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import SessionPeople from './SessionPeople.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { slide } from 'svelte/transition';
	import { modeIcons, modeLabels } from './sessionModes';
	import {
		sessionRows,
		type ListedSession,
		type OpenSession,
		type SessionRow
	} from './sessionRows';

	/**
	 * Everything there is to scan in: the info mode, every running session to join, and every
	 * session scanned in before, each with its place on the participation certificates.
	 */
	interface Props {
		conferenceId: string;
		openSessions: OpenSession[];
		/** Participant care sets sessions up, renames them and decides about the certificates. */
		canManage: boolean;
		/** Whether the form for a new session is unfolded. */
		creating: boolean;
		createForm: Snippet;
		onJoin: (open: OpenSession) => void;
		/** Opens an ended session again and joins it. */
		onReopen: (session: OpenSession) => Promise<void>;
		onStartInfo: () => void;
		/** Renames a session; a name another session has is refused. */
		onRenameSession: (id: string, name: string) => Promise<void>;
	}

	let {
		conferenceId,
		openSessions,
		canManage,
		creating = $bindable(),
		createForm,
		onJoin,
		onReopen,
		onStartInfo,
		onRenameSession
	}: Props = $props();

	// Only participant care sees the ended sessions; everybody else joins the running ones.
	const listed: ListedSession[] = $derived(
		canManage
			? await client.liveQuery.attendanceSessions({
					__args: { where: { conferenceId: { eq: conferenceId } } },
					id: true,
					occasion: true,
					startedAt: true,
					endedAt: true,
					mode: true,
					entryCount: true,
					showOnCertificate: true
				})
			: []
	);
	const rows = $derived(sessionRows({ listed, openSessions }));

	let saving = $state<string>();

	async function toggleCertificate({ id, show }: { id: string; show: boolean }) {
		saving = id;
		try {
			await client.mutate.setAttendanceSessionOnCertificate({ __args: { id, show } });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			saving = undefined;
		}
	}

	let reopening = $state<string>();

	async function reopen(session: OpenSession) {
		reopening = session.id;
		try {
			await onReopen(session);
		} catch {
			// The toast of `onReopen` reports it
		} finally {
			reopening = undefined;
		}
	}

	/** The session whose people are unfolded, one at a time. */
	let peopleOf = $state<string>();

	const formatTime = (date: Date) =>
		date.toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' });
</script>

{#snippet sessionInfo(row: SessionRow)}
	{#if row.open}
		<div class="inline-grid shrink-0 *:[grid-area:1/1]">
			<span class="status status-success"></span>
			<span class="status status-success animate-ping"></span>
		</div>
	{:else}
		<span class="status shrink-0"></span>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col">
		<EditableIdentityField
			size="sm"
			readonly={!canManage}
			label={m.scanRenameSession({ occasion: row.name })}
			initialValue={row.name}
			onSave={async (value) => {
				if (value.trim() !== row.name) await onRenameSession(row.id, value);
			}}
		>
			<span class="truncate {row.open ? 'font-semibold' : ''}">{row.name}</span>
		</EditableIdentityField>
		<span class="flex flex-wrap items-center gap-x-1.5 text-xs text-base-content/60">
			{#if row.open}
				<i class="fa-sharp-duotone fa-solid {modeIcons[row.open.mode]}"></i>
				{modeLabels[row.open.mode]()} · {m.scanRunningSince({
					time: formatTime(row.open.startedAt)
				})}
			{:else}
				{formatTime(row.startedAt)}
			{/if}
			{#if row.listed}
				· {m.certificateOccasionsCounts({ entries: row.listed.entryCount })}
			{/if}
		</span>
	</div>
{/snippet}

{#snippet sessionActions(row: SessionRow)}
	{#if row.listed && canManage}
		<label class="label shrink-0 cursor-pointer gap-2 text-xs">
			<span class="hidden md:inline">{m.certificateOccasionsShow()}</span>
			<input
				type="checkbox"
				class="toggle toggle-success toggle-sm"
				checked={row.listed.showOnCertificate}
				disabled={saving === row.id}
				aria-label={m.certificateOccasionsShowFor({ occasion: row.name })}
				onchange={(event) => toggleCertificate({ id: row.id, show: event.currentTarget.checked })}
			/>
		</label>
		<button
			class="btn btn-ghost btn-sm btn-square shrink-0"
			aria-expanded={peopleOf === row.id}
			onclick={() => (peopleOf = peopleOf === row.id ? undefined : row.id)}
			aria-label={peopleOf === row.id ? m.sessionPeopleHide() : m.sessionPeopleShow()}
			title={peopleOf === row.id ? m.sessionPeopleHide() : m.sessionPeopleShow()}
		>
			<i class="fa-sharp-duotone fa-solid fa-users"></i>
		</button>
	{/if}
	{#if row.open}
		{@const open = row.open}
		<button
			class="btn btn-primary btn-sm shrink-0"
			onclick={() => onJoin(open)}
			aria-label={m.scanJoinSession()}
		>
			<i class="fa-sharp-duotone fa-solid fa-right-to-bracket"></i>
			<span class="hidden sm:inline">{m.scanJoinSession()}</span>
		</button>
	{:else if row.listed && canManage}
		{@const ended = row.listed}
		<button
			class="btn btn-soft btn-sm shrink-0"
			disabled={reopening === row.id}
			onclick={() => reopen(ended)}
			aria-label={m.scanReopenSession()}
		>
			<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
			<span class="hidden sm:inline">{m.scanReopenSession()}</span>
		</button>
	{/if}
{/snippet}

{#snippet sessionRow(row: SessionRow)}
	<li class="flex flex-col">
		<div class="flex items-center gap-3 px-3 py-2.5">
			{@render sessionInfo(row)}
			{@render sessionActions(row)}
		</div>
		{#if peopleOf === row.id}
			<div class="px-3 pb-3" transition:slide={{ duration: 200 }}>
				<SessionPeople sessionId={row.id} onSelect={openUserCard} />
			</div>
		{/if}
	</li>
{/snippet}

<section class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h3 class="font-semibold">{m.scanSessions()}</h3>
		<!-- Setting a session up is tucked away: most of the team only joins one -->
		{#if canManage}
			<button
				class="btn btn-sm {creating ? 'btn-ghost' : 'btn-primary'}"
				aria-expanded={creating}
				onclick={() => (creating = !creating)}
			>
				<i
					class="fa-sharp-duotone fa-solid fa-plus transition-transform duration-200 {creating
						? 'rotate-45'
						: ''}"
				></i>
				{creating ? m.cancel() : m.scanNewSession()}
			</button>
		{/if}
	</div>

	{#if creating}
		{@render createForm()}
	{/if}

	<ul class="bg-base-200 divide-y divide-base-content/5 rounded-box">
		<!-- Looking people up needs no session, and anyone on the team may do it -->
		<li class="flex items-center gap-3 px-3 py-2.5">
			<i class="fa-sharp-duotone fa-solid {modeIcons.INFO} shrink-0 text-base-content/60"></i>
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="font-semibold">{m.scanModeInfo()}</span>
				<span class="hidden text-xs text-base-content/60 sm:block">{m.scanModeInfoHint()}</span>
			</div>
			<button
				class="btn btn-soft btn-sm shrink-0"
				onclick={onStartInfo}
				aria-label={m.scanStartInfo()}
				title={m.scanModeInfoHint()}
			>
				<i class="fa-sharp-duotone fa-solid fa-play"></i>
				<span class="hidden sm:inline">{m.scanStartInfo()}</span>
			</button>
		</li>
		{#each rows as row (row.id)}
			{@render sessionRow(row)}
		{/each}
	</ul>

	{#if canManage && rows.length > 0}
		<p class="px-1 text-xs text-base-content/60">{m.certificateOccasionsDescription()}</p>
	{/if}
</section>
