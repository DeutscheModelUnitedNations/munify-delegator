import type { ServerMode } from './attendanceSession';

/** A session somebody still scans in. */
export interface OpenSession {
	id: string;
	occasion: string;
	startedAt: Date;
	mode: ServerMode;
}

/** An occasion as the certificates list it: its sessions merged by name. */
export interface Occasion {
	name: string;
	sessions: number;
	entries: number;
	firstStartedAt: Date;
	showOnCertificate: boolean;
}

/** One row of the sessions table: an occasion, a session still open under its name, or both. */
export interface SessionRow {
	key: string;
	name: string;
	occasion: Occasion | null;
	open: OpenSession | null;
}

/** The name sessions are merged by, as the server compares it. */
const occasionKey = (name: string) => name.trim().toLowerCase();

const startOf = (row: SessionRow) =>
	(row.open?.startedAt ?? row.occasion?.firstStartedAt ?? new Date(0)).getTime();

/**
 * The rows of the sessions table: every occasion with the latest session still open under its
 * name, and open sessions whose occasion is not listed (yet, or not for the caller). Running ones
 * come first, then the newest.
 */
export function sessionRows({
	occasions,
	openSessions
}: {
	occasions: Occasion[];
	openSessions: OpenSession[];
}): SessionRow[] {
	const latestOpen = new Map<string, OpenSession>();
	for (const open of openSessions) {
		const key = occasionKey(open.occasion);
		const known = latestOpen.get(key);
		if (!known || known.startedAt < open.startedAt) latestOpen.set(key, open);
	}
	const rows: SessionRow[] = occasions.map((occasion) => {
		const key = occasionKey(occasion.name);
		return { key, name: occasion.name, occasion, open: latestOpen.get(key) ?? null };
	});
	const listed = new Set(rows.map((row) => row.key));
	for (const [key, open] of latestOpen) {
		if (!listed.has(key)) rows.push({ key, name: open.occasion, occasion: null, open });
	}
	return rows.sort((a, b) => Number(!!b.open) - Number(!!a.open) || startOf(b) - startOf(a));
}
