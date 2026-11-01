import type { ServerMode } from './attendanceSession';

/** A session somebody still scans in. */
export interface OpenSession {
	id: string;
	occasion: string;
	startedAt: Date;
	mode: ServerMode;
}

/** A session as participant care lists it, running or ended, with its place on the certificates. */
export interface ListedSession extends OpenSession {
	endedAt: Date | null;
	entryCount: number;
	showOnCertificate: boolean;
}

/** One row of the sessions table: a session, open to join or not. */
export interface SessionRow {
	id: string;
	name: string;
	startedAt: Date;
	/** Set while it runs, to join. */
	open: OpenSession | null;
	/** Set for participant care, who see every session. */
	listed: ListedSession | null;
}

/**
 * The rows of the sessions table: every listed session, and open ones not listed (yet, or not for
 * the caller). Running ones come first, then the newest.
 */
export function sessionRows({
	listed,
	openSessions
}: {
	listed: ListedSession[];
	openSessions: OpenSession[];
}): SessionRow[] {
	const rows: SessionRow[] = listed.map((session) => ({
		id: session.id,
		name: session.occasion,
		startedAt: session.startedAt,
		open: session.endedAt === null ? session : null,
		listed: session
	}));
	const known = new Set(rows.map((row) => row.id));
	for (const open of openSessions) {
		if (known.has(open.id)) continue;
		rows.push({ id: open.id, name: open.occasion, startedAt: open.startedAt, open, listed: null });
	}
	return rows.sort(
		(a, b) => Number(!!b.open) - Number(!!a.open) || b.startedAt.getTime() - a.startedAt.getTime()
	);
}

/** The session already holding a name, compared as the server does: ignoring case and spaces. */
export function sessionNamed<S extends { occasion: string }>({
	sessions,
	name
}: {
	sessions: readonly S[];
	name: string;
}) {
	const key = name.trim().toLowerCase();
	return sessions.find((session) => session.occasion.trim().toLowerCase() === key);
}
