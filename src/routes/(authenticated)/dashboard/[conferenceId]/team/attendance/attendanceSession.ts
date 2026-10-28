import { hasErrorCode } from '#lib/api/errorCodes.js';
import { isNetworkError, type QueueEntry } from './attendanceQueue';
import type { ScanIssue } from './scanCheck';
import type { FoundPerson } from './scanLoad';

/** One scan in a session's local log. */
export interface ScanLogEntry {
	userId: string;
	timestamp: string;
	synced: boolean;
	checkPassed: boolean | null;
	/** Who was scanned, once known, for the list of recent scans. */
	label?: string;
}

/** What the backend knows as a session's mode. */
export type ServerMode = 'CHECK' | 'RECORD' | 'BADGE';

export interface ScanSession {
	id: string;
	occasion: string;
	conferenceId: string;
	startedAt: string;
	/** Whether the server knows the session yet; it may have been started offline. */
	started: boolean;
	/** What a scan does in this session, fixed when it started. */
	mode: ServerMode;
	/** The survey options a scanned person should have picked one of, sent when it starts. */
	surveyOptionIds?: string[];
	entries: ScanLogEntry[];
}

/** A person's name for display, empty when neither part is known. */
export function fullName(user: { givenName?: string | null; familyName?: string | null }) {
	return [user.givenName, user.familyName].filter(Boolean).join(' ');
}

/** The text a failed lookup or save shows: offline, the error's own message, else the fallback. */
export function scanErrorText(err: unknown, offlineText: string, fallback: string) {
	if (isNetworkError(err)) return offlineText;
	return err instanceof Error ? err.message : fallback;
}

/** Whether the server refused a scan because another device logged the person in this session. */
export function isAlreadyScanned(err: unknown) {
	return hasErrorCode(err, 'ALREADY_SCANNED');
}

/**
 * Where renaming session `id` takes effect: on the server unless it is this device's session and
 * has not reached the server yet (it then starts under the new name), and here when it is this
 * device's session.
 */
export function renameTargets(local: ScanSession | null, id: string) {
	const isLocal = local?.id === id;
	return { server: !isLocal || !!local?.started, local: isLocal ? local : null };
}

/** Whether any entry of the session is still waiting to be sent. */
export function hasUnsynced(session: ScanSession | null) {
	return session?.entries.some((entry) => !entry.synced) ?? false;
}

/** Whether the entries hold a scan of the person; `syncedOnly` ignores those still on their way. */
export function hasScanOf(entries: ScanLogEntry[] | undefined, userId: string, syncedOnly = false) {
	return entries?.some((e) => e.userId === userId && (!syncedOnly || e.synced)) ?? false;
}

/** The log entry of one scan, found by who and when. */
export function findLogged(entries: ScanLogEntry[] | undefined, userId: string, timestamp: string) {
	return entries?.find((e) => e.userId === userId && e.timestamp === timestamp);
}

/** The scans a restored session still has to send, as queue entries. */
export function queueFromEntries(entries: ScanLogEntry[]): QueueEntry[] {
	return entries
		.filter((e) => !e.synced)
		.map((e) => ({
			localId: crypto.randomUUID(),
			userId: e.userId,
			timestamp: e.timestamp,
			status: 'pending' as const,
			retryCount: 0,
			checkPassed: e.checkPassed ?? null
		}));
}

export type ScanIntake =
	| { action: 'ignore' }
	/** Another code is being worked on; the field goes back to it. */
	| { action: 'hold'; held: string }
	| { action: 'take'; trimmed: string };

/** What to do with a code that appeared in the scanner's field. */
export function scanIntake(code: string, held: string | null, active: boolean): ScanIntake {
	if (!active) return { action: 'ignore' };
	if (held !== null) return { action: 'hold', held };
	const trimmed = code.trim();
	return trimmed ? { action: 'take', trimmed } : { action: 'ignore' };
}

/** What the result beside the camera shows for the scan being worked on. */
export type Shown =
	| { state: 'loading'; userId: string }
	| { state: 'notFound'; userId: string }
	| {
			state: 'person';
			person: FoundPerson;
			issues: ScanIssue[];
			/** Whether the session held a scan of the person before this one. */
			alreadyScanned: boolean;
			awaiting: 'badge' | 'ack' | 'decide' | null;
			badgeInput: string;
	  };

export type ShownPerson = Extract<Shown, { state: 'person' }>;

export const isShownPerson = (value: Shown | null): value is ShownPerson =>
	value?.state === 'person';

/**
 * What a scanned person waits for: the card (badge mode), nothing when all is clear, and with open
 * points either an acknowledgement or, where the scan is recorded only on purpose (`decides`, the
 * check mode), the decision whether to record it anyway.
 */
export function scanStep(
	badgeMode: boolean,
	passed: boolean,
	decides = false
): ShownPerson['awaiting'] {
	if (badgeMode) return 'badge';
	if (passed) return null;
	return decides ? 'decide' : 'ack';
}

/** Whether a person with these open points can be recorded anyway; the server would refuse these. */
export function mayRecordAnyway(issues: readonly ScanIssue[]) {
	return !issues.some(
		(issue) => issue === 'alreadyScanned' || issue === 'notInConference' || issue === 'teamMember'
	);
}

/** The result for a person who was looked up. */
export function personShown(
	person: FoundPerson,
	issues: ScanIssue[],
	alreadyScanned: boolean,
	awaiting: ShownPerson['awaiting']
): ShownPerson {
	return {
		state: 'person',
		person,
		issues,
		alreadyScanned,
		awaiting,
		badgeInput: person.status.accessCardId ?? ''
	};
}
