import { db, schema } from '$api/db/db';
import { and, eq, isNotNull } from 'drizzle-orm';
import allNations from 'world-countries';

/**
 * Nametag handout: participants with a nation are split into a few bins by the first letter of
 * it, so the queue at the entrance is spread over several tables. A bin is a run of consecutive
 * letters; a letter is never divided. Everyone without a nation (non-state actors, press,
 * individual roles) and the supervisors always get a table of their own after those.
 *
 * The split is pure and lives apart from the queries so the rules can be unit tested.
 */

/** The most bins a conference can ask for: more would leave most of them empty. */
export const MAX_NAMETAG_BINS = 20;

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

/** The languages a nation's name is known in; anything else falls back to English. */
const GERMAN = 'de';

/**
 * The name a nation is filed under: in the language of the person looking at the signs, since that
 * is the name they will search for. It is what the letters and the sort order of a sign follow.
 */
function nationName(alpha3Code: string, locale: string): string {
	const nation = allNations.find((candidate) => candidate.cca3 === alpha3Code.toUpperCase());
	if (!nation) return alpha3Code;
	return locale === GERMAN
		? (nation.translations.deu?.common ?? nation.name.common)
		: nation.name.common;
}

/**
 * The first letter A-Z of the nation's name in `locale`, so Germany is a D for a German reader and
 * a G for an English one. Diacritics are dropped (Ägypten → A). Codes the nation list does not know
 * fall back to their own first letter.
 */
export function nationInitial(alpha3Code: string, locale: string): string {
	const letter = nationName(alpha3Code, locale)
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
function isBetter(cost: Cost, current: Cut | null, minimize: 'max' | 'squares'): boolean {
	if (!current) return true;
	return minimize === 'max' ? cost.max < current.cost.max : cost.squares < current.cost.squares;
}

function bestCut(
	loads: number[],
	binCount: number,
	specialBin: number,
	extra: number,
	limit: number,
	minimize: 'max' | 'squares'
): Cut | null {
	const n = loads.length;
	const prefix = [0];
	for (const load of loads) prefix.push(prefix[prefix.length - 1] + load);

	// best[j][i]: the first i letters spread over the first j bins
	const best: (Cut | null)[][] = Array.from({ length: binCount + 1 }, () =>
		Array.from({ length: n + 1 }, () => null)
	);
	best[0][0] = { cost: { max: 0, squares: 0 }, cuts: [] };

	/** Extends the cut of the first `from` letters over `j - 1` bins by the bin `from..i`. */
	const extend = (j: number, i: number, from: number) => {
		const before = best[j - 1][from];
		if (!before) return;
		const size = prefix[i] - prefix[from] + (j - 1 === specialBin ? extra : 0);
		if (size > limit) return;
		const cost = {
			max: Math.max(before.cost.max, size),
			squares: before.cost.squares + size * size
		};
		if (isBetter(cost, best[j][i], minimize)) best[j][i] = { cost, cuts: [...before.cuts, i] };
	};

	for (let j = 1; j <= binCount; j++) {
		for (let i = 0; i <= n; i++) {
			for (let from = 0; from <= i; from++) extend(j, i, from);
		}
	}

	return best[binCount][n];
}

/**
 * Splits participants into `binCount` bins of consecutive letters that are as equal in size as
 * possible. `others` (no nation) are not part of that: they get one more bin of their own.
 */
export function splitIntoNametagBins(
	letterCounts: LetterCount[],
	others: number,
	binCount: number
): NametagBin[] {
	const bins = Math.max(1, Math.min(MAX_NAMETAG_BINS, Math.floor(binCount)));

	const perLetter = new Map<string, number>();
	for (const { letter, count } of letterCounts) {
		if (count > 0) perLetter.set(letter, (perLetter.get(letter) ?? 0) + count);
	}
	const letters = [...perLetter.keys()].sort();
	const loads = letters.map((letter) => perLetter.get(letter) ?? 0);

	// First the smallest possible fullest bin, then among the cuts reaching it the most even spread.
	const smallest = bestCut(loads, bins, -1, 0, Infinity, 'max');
	const chosen = smallest && bestCut(loads, bins, -1, 0, smallest.cost.max, 'squares');
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

/**
 * The users of the supervisors who attend and have at least one accepted student: a person with
 * a nation or non-state actor, or a single participant with a role. A supervisor whose students
 * all went without a seat has nothing to attend and gets no nametag.
 */
async function seatedSupervisorUserIds(conferenceId: string): Promise<string[]> {
	const supervisors = await db.query.conferenceSupervisor.findMany({
		where: { conferenceId, plansOwnAttendenceAtConference: true },
		columns: { userId: true },
		with: {
			supervisedDelegationMembers: {
				columns: {},
				with: {
					delegation: { columns: { assignedNationAlpha3Code: true, assignedNonStateActorId: true } }
				}
			},
			supervisedSingleParticipants: { columns: { assignedRoleId: true } }
		}
	});
	return supervisors
		.filter(
			(supervisor) =>
				supervisor.supervisedDelegationMembers.some(
					(member) =>
						member.delegation.assignedNationAlpha3Code || member.delegation.assignedNonStateActorId
				) || supervisor.supervisedSingleParticipants.some((single) => single.assignedRoleId)
		)
		.map((supervisor) => supervisor.userId);
}

/** The bins of a conference's seated participants. Everyone who holds a seat gets a nametag. */
export async function loadNametagBins(conferenceId: string, binCount: number, locale: string) {
	const [nationDelegations, nonStateActorDelegations, pressAndIndividuals, supervisors] =
		await Promise.all([
			db.query.delegation.findMany({
				where: { conferenceId, assignedNationAlpha3Code: { isNotNull: true } },
				columns: { assignedNationAlpha3Code: true, memberCount: true }
			}),
			db.query.delegation.findMany({
				where: { conferenceId, assignedNonStateActorId: { isNotNull: true } },
				columns: { memberCount: true }
			}),
			db.$count(
				schema.singleParticipant,
				and(
					eq(schema.singleParticipant.conferenceId, conferenceId),
					isNotNull(schema.singleParticipant.assignedRoleId)
				)
			),
			seatedSupervisorUserIds(conferenceId).then((ids) => ids.length)
		]);

	const letterCounts = nationDelegations.flatMap((delegation) =>
		delegation.assignedNationAlpha3Code
			? [
					{
						letter: nationInitial(delegation.assignedNationAlpha3Code, locale),
						count: delegation.memberCount
					}
				]
			: []
	);
	const others =
		pressAndIndividuals +
		supervisors +
		nonStateActorDelegations.reduce((sum, delegation) => sum + delegation.memberCount, 0);

	return splitIntoNametagBins(letterCounts, others, binCount);
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

async function nationGroups(
	conferenceId: string,
	letters: string[],
	locale: string
): Promise<NametagBinGroup[]> {
	const delegations = await db.query.delegation.findMany({
		where: { conferenceId, assignedNationAlpha3Code: { isNotNull: true } },
		columns: { assignedNationAlpha3Code: true, memberCount: true }
	});
	return delegations.flatMap((delegation) => {
		const code = delegation.assignedNationAlpha3Code;
		if (!code || !letters.includes(nationInitial(code, locale))) return [];
		return [
			{
				nationAlpha3Code: code,
				roleName: null,
				sortName: nationName(code, locale),
				nationAlpha2Code:
					allNations.find((nation) => nation.cca3 === code.toUpperCase())?.cca2.toLowerCase() ??
					null,
				fontAwesomeIcon: null,
				participants: delegation.memberCount
			}
		];
	});
}

function roleGroup(name: string, icon: string | null, participants: number): NametagBinGroup {
	return {
		nationAlpha3Code: null,
		sortName: name,
		nationAlpha2Code: null,
		roleName: name || null,
		fontAwesomeIcon: icon,
		participants
	};
}

/** Every single participant holds a role of their own; the supervisors form one group. */
function singleRoleGroups(
	singles: { assignedRole: { name: string; fontAwesomeIcon: string | null } | null }[],
	supervisors: number,
	locale: string
) {
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
		const name = locale === GERMAN ? 'Betreuende' : 'Supervisors';
		perRole.set(name, { icon: 'chalkboard-user', participants: supervisors });
	}
	return [...perRole].map(([name, { icon, participants }]) => roleGroup(name, icon, participants));
}

async function otherGroups(conferenceId: string, locale: string): Promise<NametagBinGroup[]> {
	const [nonStateActors, singles, supervisors] = await Promise.all([
		db.query.delegation.findMany({
			where: { conferenceId, assignedNonStateActorId: { isNotNull: true } },
			columns: { memberCount: true },
			with: { assignedNonStateActor: { columns: { name: true, fontAwesomeIcon: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: { conferenceId, assignedRoleId: { isNotNull: true } },
			columns: {},
			with: { assignedRole: { columns: { name: true, fontAwesomeIcon: true } } }
		}),
		seatedSupervisorUserIds(conferenceId).then((ids) => ids.length)
	]);

	const groups = nonStateActors.map((delegation) =>
		roleGroup(
			delegation.assignedNonStateActor?.name ?? '',
			delegation.assignedNonStateActor?.fontAwesomeIcon ?? null,
			delegation.memberCount
		)
	);

	groups.push(...singleRoleGroups(singles, supervisors, locale));
	return groups;
}

/** The nations, non-state actors and roles sent to bin `index` of the split `loadNametagBins` makes. */
export async function loadNametagBinGroups(
	conferenceId: string,
	binCount: number,
	index: number,
	locale: string
): Promise<NametagBinGroup[]> {
	const bin = (await loadNametagBins(conferenceId, binCount, locale))[index];
	if (!bin) return [];

	const nations =
		bin.letters.length > 0 ? await nationGroups(conferenceId, bin.letters, locale) : [];
	const others = bin.otherParticipants > 0 ? await otherGroups(conferenceId, locale) : [];
	return [...nations, ...others];
}

export interface OwnNametagTable {
	index: number;
	fromLetter: string | null;
	toLetter: string | null;
	/** Whether the table is the one of press, individual roles and non-state actors. */
	others: boolean;
}

/**
 * The table `userId` fetches their nametag at, or `null` without a seat (not assigned yet, or not
 * part of the conference). Everyone with a nation goes by its first letter, everyone else to the
 * table that serves press, roles and non-state actors.
 */
export async function loadOwnNametagTable(
	conferenceId: string,
	binCount: number,
	userId: string,
	locale: string
): Promise<OwnNametagTable | null> {
	const [member, single, supervisor] = await Promise.all([
		db.query.delegationMember.findFirst({
			where: { conferenceId, userId },
			columns: {},
			with: {
				delegation: { columns: { assignedNationAlpha3Code: true, assignedNonStateActorId: true } }
			}
		}),
		db.query.singleParticipant.findFirst({
			where: { conferenceId, userId },
			columns: { assignedRoleId: true }
		}),
		seatedSupervisorUserIds(conferenceId).then((ids) => ids.includes(userId))
	]);

	const nation = member?.delegation.assignedNationAlpha3Code ?? null;
	const seated =
		!!nation ||
		!!supervisor ||
		!!member?.delegation.assignedNonStateActorId ||
		!!single?.assignedRoleId;
	if (!seated) return null;

	const bins = await loadNametagBins(conferenceId, binCount, locale);
	const initial = nation ? nationInitial(nation, locale) : null;
	const index = bins.findIndex((bin) =>
		initial ? bin.letters.includes(initial) : bin.otherParticipants > 0
	);
	if (index < 0) return null;

	const { fromLetter, toLetter } = bins[index];
	return { index, fromLetter, toLetter, others: !initial };
}
