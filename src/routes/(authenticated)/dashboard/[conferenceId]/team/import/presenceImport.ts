import {
	chasePresenceSchema,
	type ChasePresence,
	type ChasePresenceParticipant,
	type ChasePresenceRepresentation
} from '#lib/schemata/chasePresence.js';

/** The parsed file, or why it is not one. */
export function parsePresenceExport(
	text: string
): { ok: true; data: ChasePresence } | { ok: false } {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return { ok: false };
	}
	const parsed = chasePresenceSchema.safeParse(json);
	return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
}

export interface ScoredDelegate {
	email: string;
	representation: ChasePresenceRepresentation | null;
	committeeId: string | null;
	/** Share of the delegate's records that say present, 0-100. */
	attendancePercentage: number;
	attended: boolean;
}

export interface ScoredNsa {
	email: string;
	representation: ChasePresenceRepresentation | null;
	/** How often a chair scanned the NSA in, in any committee. */
	checkIns: number;
	attended: boolean;
}

const checkInsOf = (p: ChasePresenceParticipant) => p.events.filter((e) => e.present).length;

/**
 * Delegates sit in one committee and are marked present or absent at every roll call, so the
 * share of present records says how much they were there; anyone without a record is left out.
 */
export function scoreDelegates(
	participants: ChasePresenceParticipant[],
	thresholdPercent: number
): ScoredDelegate[] {
	return participants
		.filter((p) => p.kind === 'DELEGATE' && p.events.length > 0)
		.map((p) => {
			const attendancePercentage = (100 * checkInsOf(p)) / p.events.length;
			return {
				email: p.email,
				representation: p.representation,
				committeeId: p.committeeId,
				attendancePercentage,
				attended: attendancePercentage >= thresholdPercent
			};
		});
}

/**
 * Non-state actors move between committees and chairs only scan them in, so a share of their
 * records says nothing (it is always all of them). They count as attended after enough check-ins.
 * Every NSA of the export is scored, so one never scanned in is marked absent rather than skipped.
 */
export function scoreNsas(
	participants: ChasePresenceParticipant[],
	minCheckIns: number
): ScoredNsa[] {
	return participants
		.filter((p) => p.kind === 'NSA')
		.map((p) => {
			const checkIns = checkInsOf(p);
			return {
				email: p.email,
				representation: p.representation,
				checkIns,
				attended: checkIns >= minCheckIns
			};
		});
}

/** What a delegate's or NSA's role column shows and sorts by: the nation's code, else the name. */
export function representationLabel(representation: ChasePresenceRepresentation | null) {
	return representation?.alpha3Code ?? representation?.name ?? 'N/A';
}
