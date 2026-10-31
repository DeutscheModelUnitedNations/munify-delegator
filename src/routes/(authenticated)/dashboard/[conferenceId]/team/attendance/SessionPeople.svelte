<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { onDestroy } from 'svelte';
	import { fullName } from './attendanceSession';
	import { SESSION_PEOPLE_PAGE, sessionPeopleWhere } from './sessionPeople';

	/**
	 * Everyone scanned in a session, newest first, searchable across the whole session rather than
	 * just this device's scans. Reading whose scan it is is participant care's, as is taking one back.
	 */
	interface Props {
		sessionId: string;
		/** Brings the person up: in the result beside the camera, or on their user card. */
		onSelect: (userId: string) => void;
		/** After a scan was taken back, so this device lets the person be scanned again. */
		onRemoved?: (userId: string) => void;
	}

	let { sessionId, onSelect, onRemoved }: Props = $props();

	const id = $derived(sessionId);

	let typed = $state('');
	/** The search as asked for, a moment after the last keystroke. */
	let search = $state('');
	let limit = $state(SESSION_PEOPLE_PAGE);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onInput(value: string) {
		typed = value;
		clearTimeout(timer);
		timer = setTimeout(() => {
			search = value;
			limit = SESSION_PEOPLE_PAGE;
		}, 250);
	}

	onDestroy(() => clearTimeout(timer));

	// One row more than shown tells whether there are more
	const entries = $derived(
		await client.liveQuery.attendanceEntries({
			__args: {
				where: sessionPeopleWhere({ sessionId: id, search }),
				orderBy: { timestamp: 'desc' },
				limit: limit + 1
			},
			id: true,
			timestamp: true,
			checkPassed: true,
			conferenceParticipant: {
				accessCardId: true,
				user: { id: true, givenName: true, familyName: true }
			},
			recordedBy: { givenName: true, familyName: true }
		})
	);
	const shown = $derived(entries.slice(0, limit));
	const hasMore = $derived(entries.length > limit);

	let removing = $state<string>();

	async function remove({
		entryId,
		userId,
		name
	}: {
		entryId: string;
		userId: string;
		name: string;
	}) {
		if (!(await confirmDialog({ text: m.sessionPeopleRemoveConfirm({ name }), danger: true })))
			return;
		removing = entryId;
		try {
			const promise = Promise.resolve(
				client.mutate.deleteAttendanceEntry({ __args: { id: entryId } })
			);
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			onRemoved?.(userId);
		} catch {
			// The toast reports it
		} finally {
			removing = undefined;
		}
	}

	const formatTime = (date: Date) =>
		date.toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' });
</script>

{#snippet personRow(entry: (typeof shown)[number])}
	{@const user = entry.conferenceParticipant.user}
	{@const name = fullName(user) || user.id}
	<li class="bg-base-100 rounded-field flex items-center gap-3 px-3 py-2">
		{#if entry.checkPassed === false}
			<i
				class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-warning"
				title={m.scanCheckFailedLogged()}
			></i>
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-circle-check text-success"></i>
		{/if}
		<button
			type="button"
			class="flex min-w-0 grow cursor-pointer flex-col text-left"
			onclick={() => onSelect(user.id)}
		>
			<span class="truncate hover:underline">{name}</span>
			<span class="truncate text-xs text-base-content/60">
				{formatTime(entry.timestamp)} · {m.sessionPeopleRecordedBy({
					name: fullName(entry.recordedBy)
				})}
				{#if entry.conferenceParticipant.accessCardId}
					· <span class="font-mono">{entry.conferenceParticipant.accessCardId}</span>
				{/if}
			</span>
		</button>
		<button
			class="btn btn-ghost btn-xs btn-square text-error shrink-0"
			disabled={removing === entry.id}
			onclick={() => remove({ entryId: entry.id, userId: user.id, name })}
			aria-label={m.sessionPeopleRemove({ name })}
			title={m.sessionPeopleRemove({ name })}
		>
			<i class="fa-sharp-duotone fa-solid fa-trash"></i>
		</button>
	</li>
{/snippet}

<div class="flex flex-col gap-2">
	<label class="input input-sm w-full">
		<i class="fa-sharp-duotone fa-solid fa-magnifying-glass text-base-content/60"></i>
		<input
			type="search"
			class="grow"
			value={typed}
			oninput={(event) => onInput(event.currentTarget.value)}
			placeholder={m.sessionPeopleSearch()}
			aria-label={m.search()}
		/>
	</label>

	{#if shown.length === 0}
		<p class="px-1 text-sm text-base-content/60">
			{search.trim() ? m.sessionPeopleNoMatch() : m.sessionPeopleEmpty()}
		</p>
	{:else}
		<ul class="flex max-h-96 flex-col gap-1 overflow-y-auto">
			{#each shown as entry (entry.id)}
				{@render personRow(entry)}
			{/each}
		</ul>
		{#if hasMore}
			<button
				class="btn btn-ghost btn-sm self-center"
				onclick={() => (limit += SESSION_PEOPLE_PAGE)}
			>
				{m.showMore()}
			</button>
		{/if}
	{/if}
</div>
