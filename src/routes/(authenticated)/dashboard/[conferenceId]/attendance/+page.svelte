<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { persisted } from 'svelte-persisted-store';
	import { get } from 'svelte/store';
	import { untrack } from 'svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import BarcodeScanner from '$lib/components/Scanner/BarcodeScanner.svelte';

	// --- Types ---

	interface QueueEntry {
		localId: string;
		userId: string;
		timestamp: string;
		status: 'pending' | 'processing' | 'success' | 'error';
		errorKind?: 'network' | 'user_not_found' | 'unknown';
		errorMessage?: string;
		retryCount: number;
	}

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

	const conferenceId: string = $derived($page.params.conferenceId ?? '');

	// --- Session state ---

	let occasion = $state('');
	let sessionActive = $state(false);

	// --- localStorage backup ---

	const sessionStore = persisted<ScanSession | null>(
		`attendanceSession-${$page.params.conferenceId}`,
		null
	);

	// --- Queue ---

	let queue = $state<QueueEntry[]>([]);
	let processing = $state(false);

	// --- Scanner ---

	let scannedCode = $state<string | null>('');
	let scannerRef = $state<BarcodeScanner>();

	// --- Mutation ---

	const createAttendanceEntryMutation = graphql(`
		mutation createAttendanceEntryForScanner(
			$userId: String!
			$conferenceId: String!
			$occasion: String!
		) {
			createOneAttendanceEntry(userId: $userId, conferenceId: $conferenceId, occasion: $occasion) {
				id
			}
		}
	`);

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
		sessionStore.set(session);
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
			const stored = get(sessionStore);
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

			// Duplicate check — warn but don't block
			const existingInQueue = queue.find((e) => e.userId === userId && e.status !== 'error');
			if (existingInQueue) {
				toast.warning(m.duplicateScan());
			}

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
			const session = get(sessionStore);
			if (session) {
				session.entries.push({ userId, timestamp: now, synced: false });
				sessionStore.set(session);
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
			while (true) {
				const pendingEntry = queue.find((e) => e.status === 'pending');
				if (!pendingEntry) break;

				pendingEntry.status = 'processing';
				queue = [...queue];

				try {
					await createAttendanceEntryMutation.mutate({
						userId: pendingEntry.userId,
						conferenceId,
						occasion: occasion.trim()
					});

					pendingEntry.status = 'success';
					queue = [...queue];
					syncedScansCounter += 1;
					toast.success(m.attendanceRecorded());

					// Update localStorage synced status
					updateLogEntrySynced(pendingEntry.userId, pendingEntry.timestamp);

					// Auto-remove success entries after 3s
					scheduleRemoval(pendingEntry.localId);
				} catch (err) {
					const isNetworkError =
						err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'));

					if (isNetworkError) {
						pendingEntry.status = 'error';
						pendingEntry.errorKind = 'network';
						pendingEntry.errorMessage = m.networkErrorRetrying();
						pendingEntry.retryCount += 1;
						queue = [...queue];

						// Schedule retry with exponential backoff
						const delay = Math.min(1000 * Math.pow(2, pendingEntry.retryCount - 1), 30000);
						setTimeout(() => {
							const entry = queue.find((e) => e.localId === pendingEntry.localId);
							if (entry && entry.status === 'error' && entry.errorKind === 'network') {
								entry.status = 'pending';
								queue = [...queue];
								processQueue();
							}
						}, delay);
					} else {
						pendingEntry.status = 'error';
						pendingEntry.errorKind = 'unknown';
						pendingEntry.errorMessage = err instanceof Error ? err.message : String(err);
						queue = [...queue];
						toast.error(pendingEntry.errorMessage);
					}
				}
			}
		} finally {
			processing = false;
		}
	}

	function updateLogEntrySynced(userId: string, timestamp: string) {
		const session = get(sessionStore);
		if (!session) return;
		const logEntry = session.entries.find(
			(e) => e.userId === userId && e.timestamp === timestamp && !e.synced
		);
		if (logEntry) {
			logEntry.synced = true;
			sessionStore.set(session);
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
		const session = get(sessionStore);
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

<div class="flex w-full flex-col gap-6 md:p-10">
	<!-- Header -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<a class="btn btn-square btn-ghost" aria-label="back" href={`/dashboard/${conferenceId}`}>
				<i class="fas fa-arrow-left"></i>
			</a>
			<h2 class="text-2xl font-bold">{m.attendanceScanner()}</h2>
		</div>
		<p class="text-base-content/70">{m.attendanceScannerDescription()}</p>
	</div>

	<!-- Session Setup / Active Session -->
	{#if !sessionActive}
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
	{:else}
		<!-- Active session bar -->
		<div class="bg-base-200 flex flex-wrap items-center gap-4 rounded-box p-4">
			<div class="flex items-center gap-2">
				<span class="badge badge-success badge-sm"></span>
				<span class="font-bold">{m.sessionActive()}</span>
				<span class="text-base-content/70">— {occasion}</span>
			</div>

			<div class="flex flex-wrap items-center gap-3 text-sm">
				<span>{m.scanCount({ count: totalScansCounter.toString() })}</span>
				<span class="text-success">{syncedScansCounter} {m.scanSynced()}</span>
				{#if pendingScans > 0}
					<span class="text-warning">{pendingScans} {m.scanPending()}</span>
				{/if}
				{#if errorScans > 0}
					<span class="text-error">{errorScans} {m.errors()}</span>
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
						<div
							class="flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm transition-all
								{entry.status === 'success' ? 'bg-success/10 text-success opacity-60' : ''}
								{entry.status === 'processing' ? 'bg-base-200' : ''}
								{entry.status === 'pending' ? 'bg-base-200' : ''}
								{entry.status === 'error' ? 'bg-error/10 text-error' : ''}"
						>
							<!-- Status icon -->
							{#if entry.status === 'success'}
								<i class="fa-solid fa-check"></i>
							{:else if entry.status === 'processing'}
								<span class="loading loading-spinner loading-xs"></span>
							{:else if entry.status === 'pending'}
								<i class="fa-duotone fa-clock"></i>
							{:else if entry.status === 'error' && entry.errorKind === 'network'}
								<i class="fa-duotone fa-arrow-rotate-right"></i>
							{:else}
								<i class="fa-solid fa-xmark"></i>
							{/if}

							<!-- User ID -->
							<span class="flex-1 truncate">{entry.userId}</span>

							<!-- Timestamp -->
							<span class="text-base-content/50 text-xs">
								{new Date(entry.timestamp).toLocaleTimeString()}
							</span>

							<!-- Error info / retry count -->
							{#if entry.status === 'error' && entry.errorKind === 'network'}
								<span class="text-xs">({entry.retryCount})</span>
							{/if}

							<!-- Dismiss button for non-network errors -->
							{#if entry.status === 'error' && entry.errorKind !== 'network'}
								<button
									class="btn btn-ghost btn-xs btn-square"
									onclick={() => dismissEntry(entry.localId)}
									aria-label="Dismiss"
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
