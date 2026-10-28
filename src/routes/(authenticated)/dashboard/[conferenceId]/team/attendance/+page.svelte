<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import hotkeys from 'hotkeys-js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import { createPersistedState } from '#lib/state/persistedState.svelte.js';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import BarcodeScanner from '#lib/components/scanner/BarcodeScanner.svelte';
	import { resolveScannedCode } from '#lib/components/scanner/userSearch.js';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { canWriteAccessCards } from '#lib/helpers/teamAccess.js';
	import { fetchTeamAccess } from '#lib/api/teamAccess.js';
	import AttendanceQueueEntry from './AttendanceQueueEntry.svelte';
	import ScanCheckResult from './ScanCheckResult.svelte';
	import SessionTable from './SessionTable.svelte';
	import { modeIcons, modeLabels, type SessionMode } from './sessionModes';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import SurveyOptionPicker from '#lib/components/survey/SurveyOptionPicker.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { isNetworkError, retryDelay, type QueueEntry } from './attendanceQueue';
	import { scanIssues, type ScanIssue } from './scanCheck';
	import {
		findLogged,
		fullName,
		hasScanOf,
		hasUnsynced,
		isAlreadyScanned,
		queueFromEntries,
		renameTargets,
		scanErrorText,
		scanIntake,
		personShown,
		scanStep,
		mayRecordAnyway,
		isShownPerson,
		type ScanLogEntry,
		type ScanSession,
		type Shown,
		type ShownPerson,
		type ServerMode
	} from './attendanceSession';
	import { acceptScannedCode, warmUpIdentityKey } from '#lib/api/identityCodeCheck.js';
	import { loadScannedPerson, type FoundPerson } from './scanLoad';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// --- Props & Params ---

	const conferenceId: string = $derived(params.conferenceId ?? '');
	const access = $derived(await fetchTeamAccess(conferenceId));
	// Setting a session up is for participant care and project management; anyone on the team may
	// join one and work in it, whatever it does.
	const maySetUpSessions = $derived(canWriteAccessCards(access));

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
	/** The active session's name, as renamed on any device. */
	const activeOccasion = $derived(
		openSessions.find((open) => open.id === sessionStore.current?.id)?.occasion ?? occasion
	);

	// --- Kind of session ---

	/** What the active session does, fixed when it started; see `attendanceSessionMode`. */
	let sessionMode = $state<SessionMode>('RECORD');
	const badgeOn = $derived(sessionMode === 'BADGE');
	// Handing out cards needs the person in front of you, so that mode checks as well
	const checking = $derived(sessionMode !== 'RECORD');

	/** The form's choice; every new session starts out on the check. */
	let setupMode = $state<ServerMode>('CHECK');
	/** Whether the form for a new session is unfolded. */
	let creating = $state(false);
	/** The survey options the new session expects; a session that only records checks none. */
	let setupSurveyOptionIds = $state<string[]>([]);

	// --- localStorage backup ---

	// One saved session per conference, so the store follows the conference in the URL.
	const sessionStore = $derived(
		createPersistedState<ScanSession | null>(`attendanceSession-${params.conferenceId}`, null)
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
			surveyOptionIds: setupMode === 'RECORD' ? [] : setupSurveyOptionIds,
			entries: []
		};
		setupSurveyOptionIds = [];
		creating = false;
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
		if (!session || session.started) return session;
		await client.mutate.startAttendanceSession({
			__args: {
				id: session.id,
				conferenceId,
				occasion: session.occasion,
				mode: session.mode,
				surveyOptionIds: session.surveyOptionIds
			},
			id: true
		});
		session.started = true;
		sessionStore.current = session;
		return session;
	}

	/** The people looked up in the info mode, newest last; in memory only. */
	let infoScans = $state<ScanLogEntry[]>([]);

	/** The stored session this device works in; the info mode has none. */
	function activeSession() {
		return sessionMode === 'INFO' ? null : sessionStore.current;
	}

	/**
	 * Renames a session. One that has not reached the server yet starts under the new name; the
	 * active one is renamed here as well.
	 */
	async function renameSession(id: string, newOccasion: string) {
		const trimmed = newOccasion.trim();
		if (!trimmed) {
			toast.error(m.attendanceOccasionEmpty());
			throw new Error(m.attendanceOccasionEmpty());
		}
		const targets = renameTargets(activeSession(), id);
		if (targets.server) await renameOnServer(id, trimmed);
		if (!targets.local) return;
		targets.local.occasion = trimmed;
		sessionStore.current = targets.local;
		occasion = trimmed;
	}

	async function renameOnServer(id: string, name: string) {
		const promise = Promise.resolve(
			client.mutate.renameAttendanceSession({ __args: { id, occasion: name } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	/** Asks before leaving scans behind that were not sent yet. */
	async function confirmLeave(session: ScanSession | null) {
		return !hasUnsynced(session) || (await confirmDialog({ text: m.scanEndWithUnsynced() }));
	}

	/** A session that cannot be closed now stays open on the server; its entries are all there. */
	function endOnServer(session: ScanSession | null) {
		if (!session?.started) return;
		Promise.resolve(client.mutate.endAttendanceSession({ __args: { id: session.id } })).catch(
			() => {}
		);
	}

	/** Stops working in the session here; `closeForEveryone` also ends it on the server. */
	async function leaveSession(closeForEveryone: boolean) {
		const session = activeSession();
		if (!(await confirmLeave(session))) return;
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

	/**
	 * The session a lookup checks the expected survey options of, once the server knows it; the
	 * info mode has none.
	 */
	async function lookupSessionId() {
		if (!activeSession()) return undefined;
		const session = await ensureSessionStarted();
		return session?.id;
	}

	/** The person a code leads to; `undefined` after a lookup that failed, which is reported. */
	async function lookUp(code: string): Promise<FoundPerson | null | undefined> {
		try {
			// The server resolves an access card number as well as a user id
			return await loadScannedPerson(conferenceId, code, await lookupSessionId());
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
		// The team is shown but never recorded, and gets no card
		const awaiting = issues.includes('teamMember') ? 'ack' : recordScan(person, issues);
		shown = personShown(person, issues, alreadyScanned, awaiting);
		if (awaiting === null) release();
	}

	/** Logs the scan of someone who is recorded, and returns what the mode waits for next. */
	function recordScan(person: FoundPerson, issues: ReturnType<typeof checkIssues>) {
		// The check records somebody with open points only when told to
		const awaiting = scanStep(badgeOn, issues.length === 0, sessionMode === 'CHECK');
		// With cards the scan is logged once the card is stored
		if (awaiting === null || awaiting === 'ack') {
			logScan(person.user.id, issues.length === 0, personLabel(person));
		}
		return awaiting;
	}

	/** Records a person despite their open points, as not having passed the check. */
	function recordAnyway() {
		const current = shown;
		if (!isShownPerson(current) || !mayRecordAnyway(current.issues)) return;
		logScan(current.person.user.id, false, personLabel(current.person));
		shown = null;
		release();
	}

	const logScan = (userId: string, passed: boolean, label: string) =>
		sessionMode === 'INFO'
			? rememberInfoScan(userId, passed, label)
			: enqueue(userId, passed, label);

	const checkIssues = (person: FoundPerson, alreadyScanned: boolean) =>
		scanIssues({
			inConference: person.inConference,
			isTeamMember: person.roles.isTeamMember,
			status: person.status,
			birthday: person.user.birthday,
			missingSurveyOptions: person.missingSurveyOptions,
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
		const person = await loadScannedPerson(
			conferenceId,
			current.person.user.id,
			await lookupSessionId()
		);
		if (!person || shown !== current) return;
		shown = {
			...current,
			person,
			issues: checkIssues(person, current.alreadyScanned)
		};
	}

	/** Store the card and log, acknowledge the open points, or record despite them. */
	async function confirmResult() {
		const current = shown;
		if (!isShownPerson(current) || current.awaiting === null) return;
		await confirmations[current.awaiting](current);
	}

	const confirmations: Record<NonNullable<ShownPerson['awaiting']>, (c: ShownPerson) => unknown> = {
		badge: storeBadge,
		decide: recordAnyway,
		ack: () => {
			shown = null;
			release();
		}
	};

	/** The card and the scan are stored together, so a rejected card logs nothing. */
	async function saveBadge(current: ShownPerson, accessCardId: string) {
		const session = await ensureSessionStarted();
		if (!session) throw new Error('No session is running');
		const timestamp = new Date().toISOString();
		const passed = current.issues.length === 0;
		await client.mutate.createAttendanceEntry({
			__args: {
				userId: current.person.user.id,
				conferenceId,
				sessionId: session.id,
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
		// Duplicate check against full session history
		if (hasScanOf(sessionStore.current?.entries, entry.userId, true)) {
			markDuplicate(entry);
			return;
		}
		try {
			await sendEntry(entry);
			markSynced(entry);
		} catch (err) {
			markRejected(entry, err);
		}
	}

	function markRejected(entry: QueueEntry, err: unknown) {
		// Another device scanned the person in this session first
		if (isAlreadyScanned(err)) markDuplicate(entry);
		else markFailed(entry, err);
	}

	async function sendEntry(entry: QueueEntry) {
		const session = await ensureSessionStarted();
		if (!session) throw new Error('No session is running');
		await client.mutate.createAttendanceEntry({
			__args: {
				userId: entry.userId,
				conferenceId,
				sessionId: session.id,
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
	{#if !maySetUpSessions && openSessions.length === 0}
		<div class="alert alert-info alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-info-circle text-lg"></i>
			<span>{m.scanSessionSetupNeedsRole()}</span>
		</div>
	{/if}
	<SessionTable
		{conferenceId}
		{openSessions}
		canManage={maySetUpSessions}
		bind:creating
		createForm={setupForm}
		onJoin={joinSession}
		onStartInfo={startInfo}
		onRenameSession={renameSession}
	/>
{/snippet}

{#snippet setupForm()}
	{@const modes = [
		{ mode: 'CHECK', icon: 'fa-user-check', label: m.scanModeCheck(), hint: m.scanModeCheckHint() },
		{ mode: 'RECORD', icon: 'fa-bolt', label: m.scanModeRecord(), hint: m.scanModeRecordHint() },
		{ mode: 'BADGE', icon: 'fa-id-card', label: m.scanBadgeOption(), hint: m.scanBadgeHint() }
	] as const}
	<section
		class="bg-base-200 flex flex-col gap-3 rounded-box p-3 md:p-4"
		aria-label={m.scanNewSession()}
		transition:slide={{ duration: 200 }}
	>
		<!-- What a scan does: the choice comes first, its explanation right under it -->
		<div class="flex flex-col gap-1">
			<div
				class="grid grid-cols-3 gap-1 rounded-field bg-base-100/40 p-1"
				role="group"
				aria-label={m.scanSessionType()}
			>
				{#each modes as option (option.mode)}
					<button
						class="btn btn-sm h-auto min-w-0 flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-2 {setupMode ===
						option.mode
							? 'btn-primary'
							: 'btn-ghost'}"
						aria-pressed={setupMode === option.mode}
						onclick={() => (setupMode = option.mode)}
					>
						<i class="fa-sharp-duotone fa-solid {option.icon}"></i>
						<span class="max-w-full truncate text-xs sm:text-sm">{option.label}</span>
					</button>
				{/each}
			</div>
			<p class="px-1 text-xs text-base-content/60">
				{modes.find((option) => option.mode === setupMode)?.hint}
			</p>
		</div>

		{#if setupMode !== 'RECORD'}
			<SurveyOptionPicker
				{conferenceId}
				bind:selected={setupSurveyOptionIds}
				collapsible
				legend={m.sessionSurveyOptions()}
				noneLabel={m.sessionSurveyOptionsNone()}
				hint={m.sessionSurveyOptionsHint()}
			/>
		{/if}

		<div class="flex flex-col gap-2 sm:flex-row">
			<input
				class="input w-full min-w-0 sm:flex-1"
				type="text"
				bind:value={occasion}
				aria-label={m.sessionOccasion()}
				placeholder={m.sessionOccasionPlaceholder()}
				onkeydown={(e) => {
					if (e.key === 'Enter') startSession();
				}}
			/>
			<button class="btn btn-primary" onclick={startSession} disabled={!occasion.trim()}>
				<i class="fa-sharp-duotone fa-solid fa-play"></i>
				{m.startSession()}
			</button>
		</div>
	</section>
{/snippet}

{#snippet activeSessionBar()}
	<div class="bg-base-200 flex flex-col gap-2 rounded-box p-3 md:p-4">
		<!-- What is running, and what can be done with it -->
		<div class="flex items-center gap-2">
			<!-- Leaves the session on this device only; it stays open for everybody else -->
			<button
				class="btn btn-ghost btn-sm btn-square shrink-0"
				onclick={() => leaveSession(false)}
				aria-label={m.scanSwitchSession()}
				title={m.scanSwitchSession()}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			</button>
			<div class="inline-grid shrink-0 *:[grid-area:1/1]" title={m.sessionActive()}>
				<span class="status status-success status-lg"></span>
				<span class="status status-success status-lg animate-ping"></span>
			</div>
			<div class="min-w-0 flex-1">
				{#if sessionMode !== 'INFO' && sessionStore.current}
					{@render sessionName(sessionStore.current.id, activeOccasion)}
				{:else}
					<span class="font-bold">{m.sessionActive()}</span>
				{/if}
			</div>
			{#if sessionMode !== 'INFO'}
				<div class="flex shrink-0 gap-1">
					<button
						class="btn btn-ghost btn-sm max-lg:btn-square"
						onclick={downloadBackup}
						aria-label={m.downloadBackup()}
						title={m.downloadBackup()}
					>
						<i class="fa-sharp-duotone fa-solid fa-download"></i>
						<span class="hidden lg:inline">{m.downloadBackup()}</span>
					</button>
					{#if maySetUpSessions}
						<button
							class="btn btn-error btn-sm max-sm:btn-square"
							onclick={() => leaveSession(true)}
							aria-label={m.endSession()}
							title={m.endSession()}
						>
							<i class="fa-sharp-duotone fa-solid fa-stop"></i>
							<span class="hidden sm:inline">{m.endSession()}</span>
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- What a scan does, and how the scans on this device stand -->
		<div class="flex flex-wrap items-center gap-2">
			{@render modeBadge(sessionMode, 'badge-sm')}
			{#if sessionMode !== 'INFO'}
				<span class="badge badge-soft badge-primary badge-sm"
					>{m.scanCount({ count: totalScansCounter.toString() })}</span
				>
				<span class="badge badge-soft badge-success badge-sm"
					>{syncedScansCounter} {m.scanSynced()}</span
				>
				{#if pendingScans > 0}
					<span class="badge badge-soft badge-warning badge-sm"
						>{pendingScans} {m.scanPending()}</span
					>
				{/if}
				{#if errorScans > 0}
					<span class="badge badge-soft badge-error badge-sm">{errorScans} {m.errors()}</span>
				{/if}
			{/if}
		</div>
	</div>
{/snippet}

<!-- Participant care may rename a session; everybody else sees its name -->
{#snippet sessionName(id: string, name: string)}
	<EditableIdentityField
		size="sm"
		readonly={!maySetUpSessions}
		label={m.scanRenameSession({ occasion: name })}
		initialValue={name}
		onSave={(value) => renameSession(id, value)}
	>
		<span class="truncate font-bold">{name}</span>
	</EditableIdentityField>
{/snippet}

{#snippet modeBadge(mode: SessionMode, size = '')}
	<span class="badge badge-soft badge-primary gap-1.5 {size}">
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
			onRecordAnyway={recordAnyway}
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
