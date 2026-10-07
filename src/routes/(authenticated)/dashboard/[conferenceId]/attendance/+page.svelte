<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { PersistedState } from '$lib/state/persistedState.svelte';
	import { untrack } from 'svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import AttendanceQueueEntry from './AttendanceQueueEntry.svelte';
	import { isNetworkError, retryDelay, type QueueEntry } from './attendanceQueue';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// --- Types ---

	interface ScanLogEntry {
		userId: string;
		timestamp: string;
		synced: boolean;
	}

	interface ScanSession {
		id: string;
		occasion: string;
		conferenceId: string;
		startedAt: string;
		entries: ScanLogEntry[];
	}

	// --- Props & Params ---

	const conferenceId: string = $derived(params.conferenceId ?? '');

	// --- Session state ---

	let occasion = $state('');
	let sessionActive = $state(false);

	// --- localStorage backup ---

	// One saved session per conference, so the store follows the conference in the URL.
	const sessionStore = $derived(
		new PersistedState<ScanSession | null>(`attendanceSession-${params.conferenceId}`, null)
	);

	// --- Queue ---

	let queue = $state<QueueEntry[]>([]);
	let processing = $state(false);

	// --- Scanner ---

	let scannedCode = $state<string | null>('');
	let scannerRef = $state<BarcodeScanner>();

	// --- Stats counters (independent of queue lifecycle) ---

	let totalScansCounter = $state(0);
	let syncedScansCounter = $state(0);
	let errorScans = $derived(queue.filter((e) => e.status === 'error').length);
	let pendingScans = $derived(
		queue.filter((e) => e.status === 'pending' || e.status === 'processing').length
	);

	// --- Session management ---

	function startSession() {
		if (!occasion.trim()) return;

		const session: ScanSession = {
			id: crypto.randomUUID(),
			occasion: occasion.trim(),
			conferenceId,
			startedAt: new Date().toISOString(),
			entries: []
		};
		sessionStore.current = session;
		sessionActive = true;
		queue = [];
		totalScansCounter = 0;
		syncedScansCounter = 0;
	}

	function endSession() {
		sessionActive = false;
	}

	// --- Restore session on load ---

	$effect(() => {
		// Only reactive dependency: conferenceId
		const id = conferenceId;
		untrack(() => {
			const stored = sessionStore.current;
			if (stored && stored.conferenceId === id) {
				occasion = stored.occasion;
				sessionActive = true;
				totalScansCounter = stored.entries.length;
				syncedScansCounter = stored.entries.filter((e) => e.synced).length;
				queue = stored.entries
					.filter((e) => !e.synced)
					.map((e) => ({
						localId: crypto.randomUUID(),
						userId: e.userId,
						timestamp: e.timestamp,
						status: 'pending' as const,
						retryCount: 0
					}));
				if (queue.length > 0) {
					processQueue();
				}
			}
		});
	});

	// --- Scan handling ---

	$effect(() => {
		// Only reactive dependency: scannedCode
		const code = scannedCode;
		if (!code) return;

		untrack(() => {
			if (!sessionActive) return;

			const userId = code.trim();
			if (!userId) return;

			const now = new Date().toISOString();

			const entry: QueueEntry = {
				localId: crypto.randomUUID(),
				userId,
				timestamp: now,
				status: 'pending',
				retryCount: 0
			};
			queue = [entry, ...queue];
			totalScansCounter += 1;

			// Add to localStorage backup
			const session = sessionStore.current;
			if (session) {
				session.entries.push({ userId, timestamp: now, synced: false });
				sessionStore.current = session;
			}

			// Reset scanner immediately for next scan
			scannedCode = '';
			scannerRef?.reset();

			processQueue();
		});
	});

	// --- Queue processor ---

	async function processQueue() {
		if (processing) return;
		processing = true;

		try {
			let pendingEntry = queue.find((e) => e.status === 'pending');
			while (pendingEntry) {
				pendingEntry.status = 'processing';
				queue = [...queue];
				await syncEntry(pendingEntry);
				pendingEntry = queue.find((e) => e.status === 'pending');
			}
		} finally {
			processing = false;
		}
	}

	/** Records one scan's attendance, unless the session already holds it. */
	async function syncEntry(entry: QueueEntry) {
		// Duplicate check against full session history
		const session = sessionStore.current;
		if (session?.entries.some((e) => e.userId === entry.userId && e.synced)) {
			markDuplicate(entry);
			return;
		}

		try {
			await client.mutate.createAttendanceEntry({
				__args: {
					userId: entry.userId,
					conferenceId,
					occasion: occasion.trim()
				},
				id: true
			});
			markSynced(entry);
		} catch (err) {
			markFailed(entry, err);
		}
	}

	function markDuplicate(entry: QueueEntry) {
		entry.status = 'error';
		entry.errorKind = 'duplicate';
		entry.errorMessage = m.duplicateScan();
		queue = [...queue];
		toast.warning(m.duplicateScan());

		// Mark session entry as synced so it won't be restored as pending on reload
		updateLogEntrySynced(entry.userId, entry.timestamp);
	}

	function markSynced(entry: QueueEntry) {
		entry.status = 'success';
		queue = [...queue];
		syncedScansCounter += 1;
		toast.success(m.attendanceRecorded());

		// Update localStorage synced status
		updateLogEntrySynced(entry.userId, entry.timestamp);

		// Auto-remove success entries after 3s
		scheduleRemoval(entry.localId);
	}

	function markFailed(entry: QueueEntry, err: unknown) {
		entry.status = 'error';
		if (!isNetworkError(err)) {
			entry.errorKind = 'unknown';
			entry.errorMessage = err instanceof Error ? err.message : String(err);
			queue = [...queue];
			toast.error(entry.errorMessage);
			return;
		}

		entry.errorKind = 'network';
		entry.errorMessage = m.networkErrorRetrying();
		entry.retryCount += 1;
		queue = [...queue];

		// Schedule retry with exponential backoff
		setTimeout(() => {
			const retried = queue.find((e) => e.localId === entry.localId);
			if (retried && retried.status === 'error' && retried.errorKind === 'network') {
				retried.status = 'pending';
				queue = [...queue];
				processQueue();
			}
		}, retryDelay(entry.retryCount));
	}

	function updateLogEntrySynced(userId: string, timestamp: string) {
		const session = sessionStore.current;
		if (!session) return;
		const logEntry = session.entries.find(
			(e) => e.userId === userId && e.timestamp === timestamp && !e.synced
		);
		if (logEntry) {
			logEntry.synced = true;
			sessionStore.current = session;
		}
	}

	function scheduleRemoval(localId: string) {
		setTimeout(() => {
			queue = queue.filter((e) => e.localId !== localId);
		}, 3000);
	}

	function dismissEntry(localId: string) {
		queue = queue.filter((e) => e.localId !== localId);
	}

	// --- Download backup ---

	function downloadBackup() {
		const session = sessionStore.current;
		if (!session) return;

		const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const date = new Date().toISOString().split('T')[0];
		a.href = url;
		a.download = `attendance-${session.occasion.replace(/\s+/g, '-')}-${date}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

{#snippet sessionSetup()}
	<FormFieldset title={m.sessionOccasion()}>
		<input
			class="input w-full"
			type="text"
			bind:value={occasion}
			placeholder={m.sessionOccasionPlaceholder()}
			onkeydown={(e) => {
				if (e.key === 'Enter') startSession();
			}}
		/>
		<button class="btn btn-primary mt-2" onclick={startSession} disabled={!occasion.trim()}>
			<i class="fa-solid fa-play"></i>
			{m.startSession()}
		</button>
	</FormFieldset>

	<div class="alert alert-info">
		<i class="fa-duotone fa-info-circle text-lg"></i>
		<span>{m.noActiveSession()}</span>
	</div>
{/snippet}

{#snippet activeSessionBar()}
	<div class="bg-base-200 flex flex-wrap items-center gap-4 rounded-box p-4">
		<div class="flex items-center gap-2">
			<div class="inline-grid *:[grid-area:1/1]">
				<span class="status status-success status-xl"></span>
				<span class="status status-success status-xl animate-ping"></span>
			</div>
			<span class="font-bold">{m.sessionActive()}</span>
			<span class="text-base-content/70">— {occasion}</span>
		</div>

		<div class="flex flex-wrap items-center gap-3 text-sm">
			<span class="badge badge-soft badge-primary"
				>{m.scanCount({ count: totalScansCounter.toString() })}</span
			>
			<span class="badge badge-soft badge-success">{syncedScansCounter} {m.scanSynced()}</span>
			{#if pendingScans > 0}
				<span class="badge badge-soft badge-warning">{pendingScans} {m.scanPending()}</span>
			{/if}
			{#if errorScans > 0}
				<span class="badge badge-soft badge-error">{errorScans} {m.errors()}</span>
			{/if}
		</div>

		<div class="ml-auto flex gap-2">
			<button class="btn btn-ghost btn-sm" onclick={downloadBackup}>
				<i class="fa-duotone fa-download"></i>
				{m.downloadBackup()}
			</button>
			<button class="btn btn-error btn-sm" onclick={endSession}>
				<i class="fa-solid fa-stop"></i>
				{m.endSession()}
			</button>
		</div>
	</div>
{/snippet}

<div class="flex w-full flex-col gap-6 md:p-10">
	<!-- Header -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<a
				class="btn btn-square btn-ghost"
				aria-label={m.back()}
				href={resolve(`/dashboard/${conferenceId}`)}
			>
				<i class="fa-duotone fa-arrow-left"></i>
			</a>
			<h2 class="text-2xl font-bold">{m.attendanceScanner()}</h2>
		</div>
		<p class="text-base-content/70">{m.attendanceScannerDescription()}</p>
	</div>

	<!-- Session Setup / Active Session -->
	{#if !sessionActive}
		{@render sessionSetup()}
	{:else}
		{@render activeSessionBar()}

		<!-- Scanner -->
		<BarcodeScanner
			bind:this={scannerRef}
			bind:scannedCode
			barcodeFormats={['data_matrix', 'code_128']}
			persistKey="useCameraForAttendanceScanner"
			manualPlaceholder={m.enterPostalRegistrationCode()}
			scanPromptText={m.scanPostalRegistrationCodePrompt()}
			cameraZIndex="z-30"
		/>

		<!-- Queue -->
		{#if queue.length > 0}
			<div class="flex flex-col gap-2">
				<h3 class="text-lg font-bold">{m.attendanceLog()}</h3>
				<div class="flex flex-col gap-1">
					{#each queue as entry (entry.localId)}
						<AttendanceQueueEntry {entry} onDismiss={() => dismissEntry(entry.localId)} />
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
