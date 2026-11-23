<script lang="ts">
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { canWatchFolders, createFolderTracker, listScans } from './folderWatch';

	/** Watches a folder the person picks and hands on every new scan in it, while the page is open. */
	interface Props {
		/** Takes in new scans; no more are handed on until it is done. */
		onscans: (files: File[]) => Promise<void>;
	}

	let { onscans }: Props = $props();

	const INTERVAL_MS = 3000;

	let folder = $state<string>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	/** Raised when the watching stops or another folder is picked: an older round ends then. */
	let round = 0;

	function stop() {
		round += 1;
		clearTimeout(timer);
		folder = undefined;
	}

	async function watch(handle: FileSystemDirectoryHandle) {
		stop();
		const current = round;
		const tracker = createFolderTracker(await listScans(handle));
		if (current !== round) return;
		folder = handle.name;
		// fallow-ignore-next-line complexity
		const look = async () => {
			try {
				const files = tracker.take(await listScans(handle));
				if (current === round && files.length > 0) await onscans(files);
			} catch (error) {
				logger.warn('Reading the watched folder failed', error);
				if (current === round) {
					stop();
					toast.error(m.scanFolderLost());
				}
			}
			if (current === round) timer = setTimeout(look, INTERVAL_MS);
		};
		timer = setTimeout(look, INTERVAL_MS);
	}

	async function pick() {
		let handle: FileSystemDirectoryHandle | undefined;
		try {
			handle = await window.showDirectoryPicker?.({ mode: 'read' });
		} catch {
			// closed without picking one
			return;
		}
		if (handle) await watch(handle);
	}

	onDestroy(stop);
</script>

{#if folder !== undefined}
	<div class="alert" role="status">
		<i aria-hidden="true" class="ph-duotone ph-folder-open icon-beat-fade text-primary text-xl"></i>
		<span>{m.scanFolderWatching({ folder })}</span>
		<button class="btn btn-sm" onclick={stop}>{m.scanFolderStop()}</button>
	</div>
{:else}
	<button
		class="btn btn-sm"
		onclick={pick}
		disabled={!canWatchFolders()}
		title={canWatchFolders() ? m.scanFolderHint() : m.scanFolderUnsupported()}
	>
		<i aria-hidden="true" class="ph-duotone ph-folder-open"></i>
		{m.scanFolderStart()}
	</button>
{/if}
