<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import hotkeys from 'hotkeys-js';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { PersistedState } from '$lib/state/persistedState.svelte';
	import { onDestroy, onMount, untrack } from 'svelte';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import { resolveScannedCode } from '$lib/components/scanner/userSearch';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { canWriteAccessCards } from '$lib/helpers/managementAccess';
	import AttendanceQueueEntry from './AttendanceQueueEntry.svelte';
	import ScanCheckResult from './ScanCheckResult.svelte';
	import { isNetworkError, retryDelay, type QueueEntry } from './attendanceQueue';
	import { scanIssues, type ScanIssue } from './scanCheck';
	import {
		findLogged,
		fullName,
		hasScanOf,
		ALREADY_SCANNED,
		hasUnsynced,
		isAlreadyScanned,
		queueFromEntries,
		scanErrorText,
		scanIntake,
		personShown,
		scanStep,
		isShownPerson,
		type ScanLogEntry,
		type ScanSession,
		type Shown,
		type ShownPerson,
		type ServerMode
	} from './attendanceSession';
	import ScanPageHeader from '$lib/components/scanner/ScanPageHeader.svelte';
	import { acceptScannedCode, warmUpIdentityKey } from '$lib/api/identityCodeCheck';
	import { loadScannedPerson, type FoundPerson } from './scanLoad';
	import { managementMembership } from '../managementMembership';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// --- Types ---

	/**
	 * What the page can be working in: a session, or INFO, which is the check without any record and
	 * without any session. It lives in memory on this device and never reaches the server.
	 */
	type SessionMode = ServerMode | 'INFO';

	// --- Props & Params ---

	const conferenceId: string = $derived(params.conferenceId ?? '');
	const membership = $derived(await managementMembership(conferenceId));
	// Setting a session up is for participant care and project management; anyone on the team may
	// join one and work in it, whatever it does.
	const maySetUpSessions = $derived(canWriteAccessCards(membership));

	// --- Session state ---

	/** The sessions anyone on the team has open, to continue in. */
	const openSessions = $derived(
		await client.liveQuery.attendanceSessions({
			__args: { where: { conferenceId: { eq: conferenceId }, endedAt: { isNull: true } } },
			id: true,
			occasion: true,
			startedAt: true,
			mode: true
		})
	);

	let occasion = $state('');
	let sessionActive = $state(false);

	// --- Kind of session ---

	const modeIcons: Record<SessionMode, string> = {
		CHECK: 'fa-user-check',
		RECORD: 'fa-bolt',
		BADGE: 'fa-id-card',
		INFO: 'fa-circle-info'
	};
	const modeLabels: Record<SessionMode, () => string> = {
		CHECK: m.scanModeCheck,
		RECORD: m.scanModeRecord,
		BADGE: m.scanBadgeOption,
		INFO: m.scanModeInfo
	};

	/** What the active session does, fixed when it started; see `attendanceSessionMode`. */
	let sessionMode = $state<SessionMode>('RECORD');
	const badgeOn = $derived(sessionMode === 'BADGE');
	// Handing out cards needs the person in front of you, so that mode checks as well
	const checking = $derived(sessionMode !== 'RECORD');

	/** The form's choice; every new session starts out on the check. */
	let setupMode = $state<ServerMode>('CHECK');

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
	let scannedFormat = $state<string | null>(null);
	let scannerRef = $state<BarcodeScanner>();
	/** The code being worked on; the scanner takes no other until it is released. */
	let heldCode: string | null = null;
	let shown = $state<Shown | null>(null);
	let busy = $state(false);
	// Until the open points are read or the card is stored, only the person is shown
	const awaitingAttention = $derived(
		(shown?.state === 'person' && shown.awaiting !== null) || shown?.state === 'notFound'
	);

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
			started: false,
			mode: setupMode,
			entries: []
		};
		sessionStore.current = session;
		sessionMode = session.mode;
		sessionActive = true;
		queue = [];
		totalScansCounter = 0;
		syncedScansCounter = 0;
		// Offline this fails, and the first entry that is sent starts the session instead
		ensureSessionStarted().catch(() => {});
	}

	/** Starts looking people up: no session, nothing is stored here or sent. */
	function startInfo() {
		infoScans = [];
		sessionMode = 'INFO';
		sessionActive = true;
	}

	/** Continues a session somebody started, here or on another device. */
	function joinSession(open: { id: string; occasion: string; startedAt: Date; mode: ServerMode }) {
		const session: ScanSession = {
			id: open.id,
			occasion: open.occasion,
			conferenceId,
			startedAt: open.startedAt.toISOString(),
			started: true,
			mode: open.mode,
			entries: []
		};
		sessionStore.current = session;
		sessionMode = session.mode;
		occasion = session.occasion;
		sessionActive = true;
		queue = [];
		totalScansCounter = 0;
		syncedScansCounter = 0;
	}

	/** Tells the server about the session, once; starting is safe to repeat. */
	async function ensureSessionStarted() {
		const session = sessionStore.current;
		if (!session || session.started) return;
		await client.mutate.startAttendanceSession({
			__args: {
				id: session.id,
				conferenceId,
				occasion: session.occasion,
				mode: session.mode
			},
			id: true
		});
		session.started = true;
		sessionStore.current = session;
	}

	/** The people looked up in the info mode, newest last; in memory only. */
	let infoScans = $state<ScanLogEntry[]>([]);

	/** The stored session this device works in; the info mode has none. */
	function activeSession() {
		return sessionMode === 'INFO' ? null : sessionStore.current;
	}

	/** Asks before leaving scans behind that were not sent yet. */
	function confirmLeave(session: ScanSession | null) {
		return !hasUnsynced(session) || confirm(m.scanEndWithUnsynced());
	}

	/** A session that cannot be closed now stays open on the server; its entries are all there. */
	function endOnServer(session: ScanSession | null) {
		if (!session?.started) return;
		Promise.resolve(client.mutate.endAttendanceSession({ __args: { id: session.id } })).catch(
			() => {}
		);
	}

	/** Stops working in the session here; `closeForEveryone` also ends it on the server. */
	function leaveSession(closeForEveryone: boolean) {
		const session = activeSession();
		if (!confirmLeave(session)) return;
		if (closeForEveryone) endOnServer(session);
		if (session) sessionStore.current = null;
		infoScans = [];
		sessionActive = false;
		sessionMode = 'RECORD';
		queue = [];
		shown = null;
		heldCode = null;
		occasion = '';
	}

	// --- Restore session on load ---

	/** Picks a stored session up again, sending whatever it had not sent yet. */
	function restoreSession(stored: ScanSession) {
		occasion = stored.occasion;
		// Sessions stored before the mode was chosen only recorded
		sessionMode = stored.mode ?? 'RECORD';
		sessionActive = true;
		totalScansCounter = stored.entries.length;
		syncedScansCounter = stored.entries.filter((e) => e.synced).length;
		queue = queueFromEntries(stored.entries);
		if (queue.length > 0) processQueue();
	}

	$effect(() => {
		// Only reactive dependency: conferenceId
		const id = conferenceId;
		untrack(() => {
			const stored = sessionStore.current;
			if (stored && stored.conferenceId === id) restoreSession(stored);
		});
	});

	// --- Scan handling ---

	/** Frees the scanner for the next code. */
	function release() {
		heldCode = null;
		scannedCode = '';
		scannerRef?.reset();
	}

	$effect(() => {
		// Only reactive dependency: scannedCode
		const code = scannedCode;
		if (!code) return;

		untrack(() => {
			const intake = scanIntake(code, heldCode, sessionActive);
			// A code typed while another is being worked on is not taken
			if (intake.action === 'hold') scannedCode = intake.held;
			if (intake.action === 'take') {
				heldCode = code;
				void handleScan(intake.trimmed, scannedFormat);
			}
		});
	});

	/** The person a code leads to; `undefined` after a lookup that failed, which is reported. */
	async function lookUp(code: string): Promise<FoundPerson | null | undefined> {
		try {
			// The server resolves an access card number as well as a user id
			return await loadScannedPerson(conferenceId, code);
		} catch (err) {
			toast.error(scanErrorText(err, m.scanCheckOffline(), m.genericToastError()));
			return undefined;
		}
	}

	/** The code to work with, or `null` when it is refused, which is reported. */
	async function acceptedCode(code: string, format: string | null) {
		const result = await acceptScannedCode(code, format);
		if (result.accepted) return result.code;
		toast.error(result.message);
		return null;
	}

	/** What a scan does: log it at once (record), or show the person first (check). */
	// fallow-ignore-next-line complexity
	async function handleScan(scanned: string, format: string | null) {
		const code = await acceptedCode(scanned, format);
		if (code === null) {
			release();
			return;
		}
		if (!checking) {
			// Offline-safe: the code is only resolved if that can be had
			enqueue(await resolveScannedCode(conferenceId, code), null);
			release();
			return;
		}

		shown = { state: 'loading', userId: code };
		const person = await lookUp(code);
		if (person === undefined) {
			shown = null;
			release();
		} else if (person === null) {
			shown = { state: 'notFound', userId: code };
		} else {
			showScanned(person);
		}
	}

	/** Whether the session held a scan of the person before; the info mode keeps none. */
	const wasScanned = (userId: string) =>
		sessionMode !== 'INFO' && hasScanOf(sessionStore.current?.entries, userId);

	/** Shows a scanned person, logs the scan, and waits for what the mode needs next. */
	function showScanned(person: FoundPerson) {
		// Looking somebody up again is no problem
		const alreadyScanned = wasScanned(person.user.id);
		const issues = checkIssues(person, alreadyScanned);
		const awaiting = scanStep(badgeOn, issues.length === 0);
		// With cards the scan is logged once the card is stored
		if (awaiting !== 'badge') logScan(person.user.id, issues.length === 0, personLabel(person));
		shown = personShown(person, issues, alreadyScanned, awaiting);
		if (awaiting === null) release();
	}

	const logScan = (userId: string, passed: boolean, label: string) =>
		sessionMode === 'INFO'
			? rememberInfoScan(userId, passed, label)
			: enqueue(userId, passed, label);

	const checkIssues = (person: FoundPerson, alreadyScanned: boolean) =>
		scanIssues({
			inConference: person.inConference,
			status: person.status,
			birthday: person.user.birthday,
			alreadyScanned
		});

	const personLabel = (person: FoundPerson) => fullName(person.user) || person.user.id;

	/** Keeps an info scan for the list of recent scans. */
	function rememberInfoScan(userId: string, checkPassed: boolean, label: string) {
		infoScans.push({
			userId,
			timestamp: new Date().toISOString(),
			synced: true,
			checkPassed,
			label
		});
	}

	/** Puts a scan in the queue and the local backup, and starts sending. */
	function enqueue(userId: string, checkPassed: boolean | null, label?: string) {
		const now = new Date().toISOString();
		const entry: QueueEntry = {
			localId: crypto.randomUUID(),
			userId,
			timestamp: now,
			status: 'pending',
			retryCount: 0,
			checkPassed,
			label
		};
		queue = [entry, ...queue];
		totalScansCounter += 1;

		const session = sessionStore.current;
		if (session) {
			session.entries.push({ userId, timestamp: now, synced: false, checkPassed, label });
			sessionStore.current = session;
		}

		processQueue();
		if (!label) void loadLabel(entry.localId, userId, now);
	}

	/** The name of a user, or empty when it cannot be had (offline). */
	async function fetchName(userId: string) {
		try {
			const user = await client.query.user({
				__args: { id: userId },
				givenName: true,
				familyName: true
			});
			return user ? fullName(user) : '';
		} catch {
			return '';
		}
	}

	/** Names a queued scan for the log; the log shows the id when this cannot be had. */
	async function loadLabel(localId: string, userId: string, timestamp: string) {
		const name = await fetchName(userId);
		if (!name) return;
		const queued = queue.find((e) => e.localId === localId);
		if (queued) queued.label = name;
		labelLogged(userId, timestamp, name);
	}

	function labelLogged(userId: string, timestamp: string, label: string) {
		const session = sessionStore.current;
		const logged = findLogged(session?.entries, userId, timestamp);
		if (!session || !logged) return;
		logged.label = label;
		sessionStore.current = session;
	}

	/** Closes the result. A card that was waited for is not stored then, and nothing is logged. */
	function closeResult() {
		shown = null;
		if (heldCode !== null) release();
	}

	/**
	 * Shows an earlier scan's person again, to look at or to edit. Nothing is logged, and a scan that
	 * is waiting for attention keeps the screen.
	 */
	async function reopen(userId: string) {
		if (heldCode !== null) return;
		if (!checking) {
			// Record mode has no result beside the camera
			openUserCard(userId);
			return;
		}

		shown = { state: 'loading', userId };
		const person = await lookUp(userId);
		shown = person ? personShown(person, checkIssues(person, false), false, null) : null;
	}

	/** Reads the person again after something changed on the result. */
	async function reloadShown() {
		const current = shown;
		if (!isShownPerson(current)) return;
		const person = await loadScannedPerson(conferenceId, current.person.user.id);
		if (!person || shown !== current) return;
		shown = {
			...current,
			person,
			issues: checkIssues(person, current.alreadyScanned)
		};
	}

	/** The primary button: store the card and log, or acknowledge the open points. */
	async function confirmResult() {
		const current = shown;
		if (!isShownPerson(current)) return;
		if (current.awaiting === 'badge') await storeBadge(current);
		else if (current.awaiting === 'ack') {
			shown = null;
			release();
		}
	}

	/** The card and the scan are stored together, so a rejected card logs nothing. */
	async function saveBadge(current: ShownPerson, accessCardId: string) {
		await ensureSessionStarted();
		const timestamp = new Date().toISOString();
		const passed = current.issues.length === 0;
		await client.mutate.createAttendanceEntry({
			__args: {
				userId: current.person.user.id,
				conferenceId,
				occasion: occasion.trim(),
				sessionId: sessionStore.current?.id,
				checkPassed: passed,
				accessCardId
			},
			id: true
		});
		logSynced(current.person.user.id, timestamp, passed, personLabel(current.person));
	}

	async function storeBadge(current: ShownPerson) {
		const accessCardId = current.badgeInput.trim();
		if (busy) return;
		if (!accessCardId) {
			toast.error(m.scanBadgeRequired());
			return;
		}
		busy = true;
		try {
			await saveBadge(current, accessCardId);
		} catch (err) {
			// Stays on the person, so the number can be corrected or tried again
			toast.error(scanErrorText(err, m.scanCheckOffline(), m.genericToastError()));
			return;
		} finally {
			busy = false;
		}

		toast.success(m.scanBadgeSaved());
		shown = null;
		release();
	}

	/** Counts a scan that was stored right away, and keeps it in the local backup. */
	function logSynced(userId: string, timestamp: string, checkPassed: boolean, label: string) {
		totalScansCounter += 1;
		syncedScansCounter += 1;
		const session = sessionStore.current;
		if (session) {
			session.entries.push({ userId, timestamp, synced: true, checkPassed, label });
			sessionStore.current = session;
		}
	}

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
		try {
			await sendEntry(entry);
			markSynced(entry);
		} catch (err) {
			// Another device scanned the person in this session first
			if (isAlreadyScanned(err)) markDuplicate(entry);
			else markFailed(entry, err);
		}
	}

	async function sendEntry(entry: QueueEntry) {
		// Duplicate check against full session history
		if (hasScanOf(sessionStore.current?.entries, entry.userId, true)) {
			throw new Error(ALREADY_SCANNED);
		}
		await ensureSessionStarted();
		await client.mutate.createAttendanceEntry({
			__args: {
				userId: entry.userId,
				conferenceId,
				occasion: occasion.trim(),
				sessionId: sessionStore.current?.id,
				checkPassed: entry.checkPassed
			},
			id: true
		});
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

	/** Gives up a scan that failed for good: it leaves the queue and the local backup. */
	function dismissEntry(entry: QueueEntry) {
		queue = queue.filter((e) => e.localId !== entry.localId);
		const session = sessionStore.current;
		if (!session) return;
		session.entries = session.entries.filter(
			(e) => !(e.userId === entry.userId && e.timestamp === entry.timestamp)
		);
		sessionStore.current = session;
	}

	const RECENT_SCANS = 5;

	/** The session's latest scans on this device, newest first, with where each stands. */
	const recentScans = $derived.by((): QueueEntry[] => {
		const entries = sessionMode === 'INFO' ? infoScans : (sessionStore.current?.entries ?? []);
		return entries
			.slice(-RECENT_SCANS)
			.reverse()
			.map((logged) => {
				const queued = queue.find(
					(e) => e.userId === logged.userId && e.timestamp === logged.timestamp
				);
				return {
					localId: `${logged.timestamp}-${logged.userId}`,
					userId: logged.userId,
					timestamp: logged.timestamp,
					status: logged.synced ? 'success' : 'pending',
					retryCount: 0,
					checkPassed: logged.checkPassed,
					...queued,
					label: logged.label ?? queued?.label
				};
			});
	});

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

	// --- Hotkeys ---

	onMount(() => {
		warmUpIdentityKey();
		hotkeys('esc', () => closeResult());
		hotkeys('alt+a', () => {
			void confirmResult();
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+a');
	});
</script>

{#snippet sessionSetup()}
	{#if maySetUpSessions}
		{@render setupForm()}
	{:else}
		<div class="alert alert-info alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-info-circle text-lg"></i>
			<span>{m.scanSessionSetupNeedsRole()}</span>
		</div>
	{/if}
	{@render openSessionList()}
	{@render infoEntry()}
{/snippet}

<!-- Looking people up needs no session, and anyone on the team may do it -->
{#snippet infoEntry()}
	<div class="bg-base-200 flex flex-wrap items-center gap-3 rounded-box p-3 md:p-4">
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="flex items-center gap-2 font-bold">
				<i class="fa-sharp-duotone fa-solid {modeIcons.INFO}"></i>
				{m.scanModeInfo()}
			</span>
			<span class="text-sm text-base-content/60">{m.scanModeInfoHint()}</span>
		</div>
		<button class="btn btn-primary btn-sm" onclick={startInfo}>
			<i class="fa-sharp-duotone fa-solid fa-play"></i>
			{m.scanStartInfo()}
		</button>
	</div>
{/snippet}

{#snippet setupForm()}
	{@const modes = [
		{ mode: 'CHECK', icon: 'fa-user-check', label: m.scanModeCheck(), hint: m.scanModeCheckHint() },
		{ mode: 'RECORD', icon: 'fa-bolt', label: m.scanModeRecord(), hint: m.scanModeRecordHint() },
		{ mode: 'BADGE', icon: 'fa-id-card', label: m.scanBadgeOption(), hint: m.scanBadgeHint() }
	] as const}
	<div class="bg-base-200 flex flex-col gap-2 rounded-box p-3 md:p-4">
		<div class="flex flex-wrap items-end gap-x-4 gap-y-3">
			<div class="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
				<span class="text-sm font-semibold">{m.scanSessionType()}</span>
				<div class="join w-full" role="group" aria-label={m.scanMode()}>
					{#each modes as option (option.mode)}
						<button
							class="btn join-item min-w-0 flex-1 px-2 sm:flex-none sm:px-4 {setupMode ===
							option.mode
								? 'btn-primary'
								: 'btn-soft'}"
							aria-pressed={setupMode === option.mode}
							onclick={() => (setupMode = option.mode)}
						>
							<i class="fa-sharp-duotone fa-solid {option.icon} hidden sm:inline"></i>
							<span class="truncate">{option.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="flex min-w-60 flex-1 flex-col gap-1">
				<label class="text-sm font-semibold" for="session-occasion">{m.sessionOccasion()}</label>
				<div class="join w-full">
					<input
						id="session-occasion"
						class="input join-item w-full min-w-0"
						type="text"
						bind:value={occasion}
						placeholder={m.sessionOccasionPlaceholder()}
						onkeydown={(e) => {
							if (e.key === 'Enter') startSession();
						}}
					/>
					<button
						class="btn btn-primary join-item"
						onclick={startSession}
						disabled={!occasion.trim()}
					>
						<i class="fa-sharp-duotone fa-solid fa-play"></i>
						{m.startSession()}
					</button>
				</div>
			</div>
		</div>
		<p class="text-sm text-base-content/60">
			{modes.find((option) => option.mode === setupMode)?.hint}
		</p>
	</div>
{/snippet}

{#snippet openSessionList()}
	{#if openSessions.length > 0}
		<div class="flex flex-col gap-2">
			<h3 class="font-semibold">{m.scanOpenSessions()}</h3>
			{#each openSessions as open (open.id)}
				<div class="bg-base-200 flex items-center gap-3 rounded-box p-3">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="truncate font-bold">{open.occasion}</span>
						<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/60">
							{@render modeBadge(open.mode)}
							<span>
								{open.startedAt.toLocaleString('de', { dateStyle: 'short', timeStyle: 'short' })}
							</span>
						</div>
					</div>
					<button class="btn btn-sm btn-primary" onclick={() => joinSession(open)}>
						<i class="fa-sharp-duotone fa-solid fa-right-to-bracket"></i>
						{m.scanJoinSession()}
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if openSessions.length === 0 && maySetUpSessions}
		<div class="alert alert-info alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-info-circle text-lg"></i>
			<span>{m.noActiveSession()}</span>
		</div>
	{/if}
{/snippet}

{#snippet activeSessionBar()}
	<div class="bg-base-200 flex flex-wrap items-center gap-2 rounded-box p-3 md:gap-4 md:p-4">
		<div class="flex items-center gap-2">
			<div class="inline-grid *:[grid-area:1/1]">
				<span class="status status-success status-xl"></span>
				<span class="status status-success status-xl animate-ping"></span>
			</div>
			<span class="font-bold">{m.sessionActive()}</span>
			{#if sessionMode !== 'INFO'}
				<span class="text-base-content/70">— {occasion}</span>
			{/if}
		</div>

		{@render modeBadge(sessionMode)}

		{#if sessionMode !== 'INFO'}
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
		{/if}

		<div class="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
			{#if sessionMode !== 'INFO'}
				<button class="btn btn-ghost btn-sm" onclick={downloadBackup}>
					<i class="fa-sharp-duotone fa-solid fa-download"></i>
					{m.downloadBackup()}
				</button>
			{/if}
			<button class="btn btn-ghost btn-sm" onclick={() => leaveSession(false)}>
				<i class="fa-sharp-duotone fa-solid fa-right-from-bracket"></i>
				{m.scanLeaveSession()}
			</button>
			{#if maySetUpSessions && sessionMode !== 'INFO'}
				<button class="btn btn-error btn-sm" onclick={() => leaveSession(true)}>
					<i class="fa-sharp-duotone fa-solid fa-stop"></i>
					{m.endSession()}
				</button>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet modeBadge(mode: SessionMode)}
	<span class="badge badge-soft badge-primary gap-1.5">
		<i class="fa-sharp-duotone fa-solid {modeIcons[mode]}"></i>
		{modeLabels[mode]()}
	</span>
{/snippet}

{#snippet resultPanel()}
	{#if shown?.state === 'person'}
		<ScanCheckResult
			canEdit={maySetUpSessions}
			person={shown.person}
			issues={shown.issues}
			awaiting={shown.awaiting}
			bind:badgeInput={shown.badgeInput}
			{busy}
			onConfirm={confirmResult}
			onClose={closeResult}
			onChanged={reloadShown}
		/>
	{:else}
		<div class="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
			{#if shown?.state === 'loading'}
				<span class="loading loading-md loading-spinner"></span>
				<span class="font-mono text-sm text-base-content/70">{shown.userId}</span>
			{:else if shown?.state === 'notFound'}
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-3xl text-warning"></i>
				<p class="text-base-content/80">{m.userNotFoundForAccessFlow()}</p>
				<button class="btn btn-ghost btn-sm" onclick={closeResult}>{m.close()}</button>
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-id-badge text-4xl text-base-content/30"></i>
				<p class="text-sm text-base-content/60">{m.scanResultPlaceholder()}</p>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="flex w-full min-w-0 flex-col gap-4 md:gap-6 md:p-10">
	{#snippet description()}{m.attendanceScannerDescription()}{/snippet}
	<ScanPageHeader title={m.attendanceScanner()} {description} />

	<!-- Session Setup / Active Session -->
	{#if !sessionActive}
		{@render sessionSetup()}
	{:else}
		{@render activeSessionBar()}

		<!-- Scanner, with the checked person beside the camera -->
		<BarcodeScanner
			bind:this={scannerRef}
			bind:scannedCode
			bind:scannedFormat
			barcodeFormats={['qr_code', 'data_matrix', 'code_128']}
			persistKey="useCameraForAttendanceScanner"
			{conferenceId}
			manualPlaceholder={m.enterPostalRegistrationCode()}
			scanPromptText={m.scanPostalRegistrationCodePrompt()}
			result={checking ? resultPanel : undefined}
			collapsed={awaitingAttention}
		/>

		<!-- Queue -->
		<!-- The latest scans -->
		<div class="flex flex-col gap-2">
			<h3 class="text-lg font-bold">{m.scanRecentScans()}</h3>
			{#if recentScans.length === 0}
				<p class="text-sm text-base-content/60">{m.scanRecentEmpty()}</p>
			{:else}
				<div class="flex flex-col gap-1">
					{#each recentScans as entry (entry.localId)}
						<AttendanceQueueEntry
							{entry}
							onDismiss={() => dismissEntry(entry)}
							onSelect={() => reopen(entry.userId)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
