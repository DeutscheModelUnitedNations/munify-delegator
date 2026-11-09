<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import type { QueueEntry } from './attendanceQueue';

	/** One scan in the attendance log: its sync state, who was scanned, and when. */
	interface Props {
		entry: QueueEntry;
		onDismiss: () => void;
		/** Brings the scanned person up again */
		onSelect: () => void;
	}

	let { entry, onDismiss, onSelect }: Props = $props();

	const rowClass = {
		success: 'bg-success/10 text-success opacity-60',
		processing: 'bg-base-200',
		pending: 'bg-base-200',
		error: 'bg-error/10 text-error'
	} satisfies Record<QueueEntry['status'], string>;

	const isNetworkError = $derived(entry.status === 'error' && entry.errorKind === 'network');
	const isDuplicate = $derived(entry.status === 'error' && entry.errorKind === 'duplicate');
</script>

<div
	class="flex items-center gap-3 rounded-box px-3 py-2 font-mono text-sm transition-all
		{rowClass[entry.status]}"
>
	<!-- Status icon -->
	{#if entry.status === 'success'}
		<i aria-hidden="true" class="ph-duotone ph-check"></i>
	{:else if entry.status === 'processing'}
		<span class="loading loading-spinner loading-xs"></span>
	{:else if entry.status === 'pending'}
		<i aria-hidden="true" class="ph-duotone ph-clock"></i>
	{:else if isNetworkError}
		<i aria-hidden="true" class="ph-duotone ph-arrow-clockwise"></i>
	{:else if isDuplicate}
		<i aria-hidden="true" class="ph-duotone ph-copy-simple"></i>
	{:else}
		<i aria-hidden="true" class="ph-duotone ph-x"></i>
	{/if}

	<!-- Who was scanned -->
	<button
		type="button"
		class="flex-1 cursor-pointer truncate text-left text-base-content hover:underline"
		onclick={onSelect}
	>
		{entry.label ?? entry.userId}
	</button>

	{#if entry.checkPassed === false}
		<span class="badge badge-soft badge-warning badge-sm gap-1" title={m.scanCheckFailedLogged()}>
			<i aria-hidden="true" class="ph-duotone ph-warning"></i>
			{m.scanIssuesFound()}
		</span>
	{/if}

	<!-- Timestamp -->
	<span class="text-base-content/50 text-xs">
		{new Date(entry.timestamp).toLocaleTimeString(getLocale())}
	</span>

	<!-- Error info / retry count -->
	{#if isNetworkError}
		<span class="text-xs">({entry.retryCount})</span>
	{:else if isDuplicate}
		<span class="text-xs">{m.duplicateScan()}</span>
	{/if}

	<!-- Dismiss button for non-network errors -->
	{#if entry.status === 'error' && !isNetworkError}
		<button class="btn btn-ghost btn-xs btn-square" onclick={onDismiss} aria-label={m.dismiss()}>
			<i aria-hidden="true" class="ph-duotone ph-x"></i>
		</button>
	{/if}
</div>
