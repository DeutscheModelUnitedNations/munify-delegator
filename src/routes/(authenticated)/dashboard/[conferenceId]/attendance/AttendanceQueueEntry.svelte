<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { QueueEntry } from './attendanceQueue';

	/** One scan in the attendance log: its sync state, who was scanned, and when. */
	interface Props {
		entry: QueueEntry;
		onDismiss: () => void;
	}

	let { entry, onDismiss }: Props = $props();

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
	class="flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-all
		{rowClass[entry.status]}"
>
	<!-- Status icon -->
	{#if entry.status === 'success'}
		<i class="fa-duotone fa-check"></i>
	{:else if entry.status === 'processing'}
		<span class="loading loading-spinner loading-xs"></span>
	{:else if entry.status === 'pending'}
		<i class="fa-duotone fa-clock"></i>
	{:else if isNetworkError}
		<i class="fa-duotone fa-arrow-rotate-right"></i>
	{:else if isDuplicate}
		<i class="fa-duotone fa-clone"></i>
	{:else}
		<i class="fa-duotone fa-xmark"></i>
	{/if}

	<!-- User ID -->
	<span class="flex-1 truncate text-base-content">{entry.userId}</span>

	<!-- Timestamp -->
	<span class="text-base-content/50 text-xs">
		{new Date(entry.timestamp).toLocaleTimeString()}
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
			<i class="fa-duotone fa-xmark"></i>
		</button>
	{/if}
</div>
