<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import type { Snippet } from 'svelte';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import { modeIcons, modeLabels } from './sessionModes';
	import { sessionRows, type OpenSession, type SessionRow } from './sessionRows';

	/**
	 * Everything there is to scan in: the info mode, every running session to join, and every
	 * occasion scanned before, each with its place on the participation certificates.
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
		onStartInfo: () => void;
		/** Renames one session, for a running one whose occasion is not listed yet. */
		onRenameSession: (id: string, name: string) => Promise<void>;
	}

	let {
		conferenceId,
		openSessions,
		canManage,
		creating = $bindable(),
		createForm,
		onJoin,
		onStartInfo,
		onRenameSession
	}: Props = $props();

	// Not live (a computed list): it is fetched again after each change here, and whenever a
	// session starts or ends. Only participant care may read it.
	let revision = $state(0);
	const openCount = $derived(openSessions.length);
	const occasions = $derived(
		canManage
			? await client.query.certificateOccasions({
					__args: { conferenceId, revision: revision + openCount },
					name: true,
					sessions: true,
					entries: true,
					firstStartedAt: true,
					showOnCertificate: true
				})
			: []
	);
	const rows = $derived(sessionRows({ occasions, openSessions }));

	let saving = $state<string>();

	async function toggleCertificate({ occasion, show }: { occasion: string; show: boolean }) {
		saving = occasion;
		try {
			await client.mutate.setAttendanceOccasionOnCertificate({
				__args: { conferenceId, occasion, show }
			});
			revision++;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			saving = undefined;
		}
	}

	/** Renames every session of the occasion; a name another occasion has merges the two. */
	async function rename({ row, name }: { row: SessionRow; name: string }) {
		if (name.trim() === row.name) return;
		if (!row.occasion && row.open) {
			await onRenameSession(row.open.id, name);
			return;
		}
		const promise = Promise.resolve(
			client.mutate.renameAttendanceOccasion({
				__args: { conferenceId, occasion: row.name, newOccasion: name }
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		revision++;
	}

	const formatTime = (date: Date) =>
		date.toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' });
</script>

{#snippet sessionRow(row: SessionRow)}
	<li class="flex items-center gap-3 px-3 py-2.5">
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
				onSave={(value) => rename({ row, name: value })}
			>
				<span class="truncate {row.open ? 'font-semibold' : ''}">{row.name}</span>
			</EditableIdentityField>
			<span class="flex flex-wrap items-center gap-x-1.5 text-xs text-base-content/60">
				{#if row.open}
					<i class="fa-sharp-duotone fa-solid {modeIcons[row.open.mode]}"></i>
					{modeLabels[row.open.mode]()} · {m.scanRunningSince({
						time: formatTime(row.open.startedAt)
					})}
				{:else if row.occasion}
					{formatTime(row.occasion.firstStartedAt)}
				{/if}
				{#if row.occasion}
					· {m.certificateOccasionsCounts({
						sessions: row.occasion.sessions,
						entries: row.occasion.entries
					})}
				{/if}
			</span>
		</div>
		{#if row.occasion && canManage}
			<label class="label shrink-0 cursor-pointer gap-2 text-xs">
				<span class="hidden md:inline">{m.certificateOccasionsShow()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success toggle-sm"
					checked={row.occasion.showOnCertificate}
					disabled={saving === row.name}
					aria-label={m.certificateOccasionsShowFor({ occasion: row.name })}
					onchange={(event) =>
						toggleCertificate({ occasion: row.name, show: event.currentTarget.checked })}
				/>
			</label>
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
		{#each rows as row (row.key)}
			{@render sessionRow(row)}
		{/each}
	</ul>

	{#if canManage && rows.length > 0}
		<p class="px-1 text-xs text-base-content/60">{m.certificateOccasionsDescription()}</p>
	{/if}
</section>
