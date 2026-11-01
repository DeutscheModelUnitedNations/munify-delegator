import { m } from '#lib/paraglide/messages';
import { z } from 'zod';
import allNations from 'world-countries';

/**
 * Nametag handout: participants with a nation are split into a few bins by the first letter of
 * it, so the queue at the entrance is spread over several tables. A bin is a run of consecutive
 * letters; a letter is never divided. Everyone without a nation (non-state actors, press,
 * individual roles) and the supervisors always get a table of their own after those.
 *
 * The split is pure and lives apart from the queries (`nametagBinsService.ts`) so the rules can be
 * unit tested.
 */

/** The most bins a conference can ask for: more would leave most of them empty. */
const MAX_NAMETAG_BINS = 20;

/** A bin count a conference can ask for: one to `MAX_NAMETAG_BINS`. */
export const binCountSchema = z
	.number()
	.int({ error: () => m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }) })
	.min(1, { error: () => m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }) })
	.max(MAX_NAMETAG_BINS, { error: () => m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }) });

interface LetterCount {
	letter: string;
	count: number;
}

export interface NametagBin {
	/** The letters of this bin that actually have participants, in alphabetical order. */
	letters: string[];
	/** First and last letter of the range the bin serves; `null` for a bin nobody is sent to. */
	fromLetter: string | null;
	toLetter: string | null;
	nationParticipants: number;
	/** Non-state actors, press and individual roles. */
	otherParticipants: number;
}

interface Cost {
	/** The size of the fullest bin. */
	max: number;
	/** The sum of the squared bin sizes, which prefers an even spread among equal maxima. */
	squares: number;
}

/**
 * The name a nation is filed under: in the conference's language, so everyone is sent to the same
 * table whatever their own interface language is. It is what the letters and the sort order of a
 * sign follow. A language without translations reads the English names.
 */
function nationName({ alpha3Code, language }: { alpha3Code: string; language: string }): string {
	const nation = allNations.find((candidate) => candidate.cca3 === alpha3Code.toUpperCase());
	if (!nation) return alpha3Code;
	return nation.translations[language]?.common ?? nation.name.common;
}

/**
 * The first letter A-Z of the nation's name in `language`, so Germany is a D in German and a G in
 * English. Diacritics are dropped (Ägypten → A). Codes the nation list does not know fall back to
 * their own first letter.
 */
export function nationInitial({
	alpha3Code,
	language
}: {
	alpha3Code: string;
	language: string;
}): string {
	const letter = nationName({ alpha3Code, language })
		.normalize('NFD')
		.replace(/[^A-Za-z]/g, '')
		.charAt(0)
		.toUpperCase();
	return letter || alpha3Code.charAt(0).toUpperCase();
}

/**
 * The cheapest way to cut `loads` (the sizes of consecutive letters) into `binCount` runs when
 * the run `specialBin` carries `extra` more people. Empty runs are allowed, there are just more
 * bins than letters then. Returns `null` when no cut keeps every bin within `limit`.
 *
 * `minimize` picks what is optimised: the size of the fullest bin, or - among the cuts that fit
 * `limit` - the sum of squares.
 */
type Cut = { cost: Cost; cuts: number[] };

/** Whether `cost` beats `current` by the measure `minimize` picks. */
function isBetter({
	cost,
	current,
	minimize
}: {
	cost: Cost;
	current: Cut | null;
	minimize: 'max' | 'squares';
}): boolean {
	if (!current) return true;
	return minimize === 'max' ? cost.max < current.cost.max : cost.squares < current.cost.squares;
}

function bestCut({
	loads,
	binCount,
	specialBin,
	extra,
	limit,
	minimize
}: {
	loads: number[];
	binCount: number;
	specialBin: number;
	extra: number;
	limit: number;
	minimize: 'max' | 'squares';
}): Cut | null {
	const n = loads.length;
	const prefix = [0];
	for (const load of loads) prefix.push(prefix[prefix.length - 1] + load);

	// best[j][i]: the first i letters spread over the first j bins
	const best: (Cut | null)[][] = Array.from({ length: binCount + 1 }, () =>
		Array.from({ length: n + 1 }, () => null)
	);
	best[0][0] = { cost: { max: 0, squares: 0 }, cuts: [] };

	/** Extends the cut of the first `from` letters over `j - 1` bins by the bin `from..i`. */
	const extend = ({ j, i, from }: { j: number; i: number; from: number }) => {
		const before = best[j - 1][from];
		if (!before) return;
		const size = prefix[i] - prefix[from] + (j - 1 === specialBin ? extra : 0);
		if (size > limit) return;
		const cost = {
			max: Math.max(before.cost.max, size),
			squares: before.cost.squares + size * size
		};
		if (isBetter({ cost, current: best[j][i], minimize }))
			best[j][i] = { cost, cuts: [...before.cuts, i] };
	};

	for (let j = 1; j <= binCount; j++) {
		for (let i = 0; i <= n; i++) {
			for (let from = 0; from <= i; from++) extend({ j, i, from });
		}
	}

	return best[binCount][n];
}

/**
 * Splits participants into `binCount` bins of consecutive letters that are as equal in size as
 * possible. `others` (no nation) are not part of that: they get one more bin of their own.
 */
export function splitIntoNametagBins({
	letterCounts,
	others,
	binCount
}: {
	letterCounts: LetterCount[];
	others: number;
	binCount: number;
}): NametagBin[] {
	const bins = Math.max(1, Math.min(MAX_NAMETAG_BINS, Math.floor(binCount)));

	const perLetter = new Map<string, number>();
	for (const { letter, count } of letterCounts) {
		if (count > 0) perLetter.set(letter, (perLetter.get(letter) ?? 0) + count);
	}
	const letters = [...perLetter.keys()].sort();
	const loads = letters.map((letter) => perLetter.get(letter) ?? 0);

	// First the smallest possible fullest bin, then among the cuts reaching it the most even spread.
	const smallest = bestCut({
		loads,
		binCount: bins,
		specialBin: -1,
		extra: 0,
		limit: Infinity,
		minimize: 'max'
	});
	const chosen =
		smallest &&
		bestCut({
			loads,
			binCount: bins,
			specialBin: -1,
			extra: 0,
			limit: smallest.cost.max,
			minimize: 'squares'
		});
	// `smallest` is reachable by construction, so a cut always exists.
	if (!chosen) throw new Error('No nametag split found');

	const result: NametagBin[] = [];
	let start = 0;
	chosen.cuts.forEach((end) => {
		const binLetters = letters.slice(start, end);
		result.push({
			letters: binLetters,
			fromLetter: null,
			toLetter: null,
			nationParticipants: loads.slice(start, end).reduce((sum, load) => sum + load, 0),
			otherParticipants: 0
		});
		start = end;
	});

	// The ranges cover the whole alphabet, so a nation that registers later still has a bin: a
	// bin starts at its first letter and runs up to the letter before the next bin's first.
	const served = result.filter((bin) => bin.letters.length > 0);
	served.forEach((bin, index) => {
		const next = served[index + 1];
		bin.fromLetter = index === 0 ? 'A' : bin.letters[0];
		bin.toLetter = next ? String.fromCharCode(next.letters[0].charCodeAt(0) - 1) : 'Z';
	});

	// the table of everyone without a nation comes after the letter tables
	if (others > 0) {
		result.push({
			letters: [],
			fromLetter: null,
			toLetter: null,
			nationParticipants: 0,
			otherParticipants: others
		});
	}

	return result;
}

export interface NametagBinGroup {
	/** Set for a nation; the browser translates it. */
	nationAlpha3Code: string | null;
	/** The non-state actor or role of everyone without a nation. */
	roleName: string | null;
	/** What the groups are sorted by: the name of a nation in the reader's language, the label of anything else. */
	sortName: string;
	/** The flag of a nation. */
	nationAlpha2Code: string | null;
	/** The icon of a non-state actor or role. */
	fontAwesomeIcon: string | null;
	participants: number;
}

/** The group of a delegation holding a nation, named in the reader's language. */
export function nationGroup({
	code,
	memberCount,
	language
}: {
	code: string;
	memberCount: number;
	language: string;
}): NametagBinGroup {
	return {
		nationAlpha3Code: code,
		roleName: null,
		sortName: nationName({ alpha3Code: code, language }),
		nationAlpha2Code:
			allNations.find((nation) => nation.cca3 === code.toUpperCase())?.cca2.toLowerCase() ?? null,
		fontAwesomeIcon: null,
		participants: memberCount
	};
}

/** The group of everyone holding one non-state actor or role. */
function roleGroup({
	name,
	icon,
	participants
}: {
	name: string;
	icon: string | null;
	participants: number;
}): NametagBinGroup {
	return {
		nationAlpha3Code: null,
		sortName: name,
		nationAlpha2Code: null,
		roleName: name || null,
		fontAwesomeIcon: icon,
		participants
	};
}

/** Each non-state actor is one group, named after its role. */
export function nonStateActorGroups(
	delegations: {
		memberCount: number;
		assignedRole: { name: string | null; fontAwesomeIcon: string | null } | null;
	}[]
): NametagBinGroup[] {
	return delegations.map(({ assignedRole, memberCount }) =>
		roleGroup({
			name: assignedRole?.name ?? '',
			icon: assignedRole?.fontAwesomeIcon ?? null,
			participants: memberCount
		})
	);
}

/** Every single participant holds a role of their own; the supervisors form one group. */
export function singleRoleGroups({
	singles,
	supervisors,
	language
}: {
	singles: { assignedRole: { name: string | null; fontAwesomeIcon: string | null } | null }[];
	supervisors: number;
	language: string;
}) {
	const perRole = new Map<string, { icon: string | null; participants: number }>();
	for (const single of singles) {
		const name = single.assignedRole?.name ?? '';
		const entry = perRole.get(name) ?? {
			icon: single.assignedRole?.fontAwesomeIcon ?? null,
			participants: 0
		};
		entry.participants++;
		perRole.set(name, entry);
	}
	if (supervisors > 0) {
		const name = language === 'deu' ? 'Betreuende' : 'Supervisors';
		perRole.set(name, { icon: 'chalkboard-user', participants: supervisors });
	}
	return [...perRole].map(([name, { icon, participants }]) =>
		roleGroup({ name, icon, participants })
	);
}

export interface OwnNametagTable {
	index: number;
	fromLetter: string | null;
	toLetter: string | null;
	/** Whether the table is the one of press, individual roles and non-state actors. */
	others: boolean;
}

/**
 * Whether someone has a seat (a role for their delegation or themselves, or a supervisor's place),
 * and the nation it is for; `null` without one.
 */
export function ownSeat({
	member,
	single,
	supervisor
}: {
	member:
		| {
				delegation: {
					assignedRoleId: string | null;
					assignedRole: { nationAlpha3Code: string | null } | null;
				};
		  }
		| undefined;
	single: { assignedRoleId: string | null } | undefined;
	supervisor: boolean;
}): { nation: string | null } | null {
	const seated = supervisor || !!member?.delegation.assignedRoleId || !!single?.assignedRoleId;
	return seated ? { nation: member?.delegation.assignedRole?.nationAlpha3Code ?? null } : null;
}

/**
 * The table of `bins` a seat is sent to: the one holding its nation's letter, or the one of
 * everyone without a nation. `null` when no table serves it.
 */
export function ownNametagTable({
	bins,
	seat,
	language
}: {
	bins: NametagBin[];
	seat: { nation: string | null };
	language: string;
}): OwnNametagTable | null {
	const initial = seat.nation ? nationInitial({ alpha3Code: seat.nation, language }) : null;
	const index = bins.findIndex((bin) =>
		initial ? bin.letters.includes(initial) : bin.otherParticipants > 0
	);
	if (index < 0) return null;

	const { fromLetter, toLetter } = bins[index];
	return { index, fromLetter, toLetter, others: !initial };
}
