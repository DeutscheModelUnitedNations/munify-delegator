import anyAscii from 'any-ascii';
import {
	findPhoneNumbersInText,
	isSupportedCountry,
	parsePhoneNumberFromString
} from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import { alpha3ToAlpha2 } from '$lib/helpers/countryCodes';
import { DUPLICATE_THRESHOLD } from '$lib/helpers/plausibilityRules';

/**
 * Finds accounts that may belong to the same person: someone who got a care note and came back
 * with a fresh account. Pure, so the scoring can be tested on its own; `possibleDuplicates.ts`
 * loads the rows and stores what this finds.
 *
 * Names are compared across scripts: every name is transliterated to Latin letters (`any-ascii`,
 * which knows Cyrillic, Greek, Arabic, Chinese, … alike) and compared with Jaro-Winkler, so
 * neither a language's phonetics nor its alphabet decide whether two spellings are close.
 */

export type MatchProfile = {
	id: string;
	givenName: string;
	familyName: string;
	birthday: Date | null;
	email: string;
	phone: string | null;
	emergencyContacts: string | null;
	street: string | null;
	zip: string | null;
	country: string | null;
};

/** Why two accounts were paired; the UI translates each. */
export type MatchReason = 'birthday' | 'name' | 'email' | 'phone' | 'emergencyContact' | 'address';

export type DuplicatePair = {
	/** the smaller of the two ids, so a pair has one row whichever side was scanned */
	userId: string;
	candidateId: string;
	score: number;
	reasons: MatchReason[];
};

/**
 * What each signal adds. None reaches the threshold alone: a shared phone number may be a
 * parent's, a shared birthday is one in 365. Siblings share a family name, an address and their
 * parents' numbers (0.2 + 0.1, plus a partly similar name) and stay below it; the same person
 * with a new address still has their name and birthday (0.35 + 0.35).
 */
const WEIGHTS = {
	birthday: 0.35,
	name: 0.35,
	nameClose: 0.2,
	email: 0.5,
	phone: 0.5,
	emergencyContact: 0.2,
	address: 0.1
} as const;

const NAME_SIMILAR = 0.9;
const NAME_CLOSE = 0.86;
const STREET_SIMILAR = 0.9;
/** Shorter local parts (`info`, `mail`) are shared by too many people to mean anything. */
const MIN_EMAIL_LOCAL = 5;

type MatchKeys = {
	id: string;
	/** the given name, and also only its first part, for a second given name left out */
	given: string[];
	family: string;
	birthday?: string;
	emailLocal?: string;
	phone?: string;
	emergencyPhones: Set<string>;
	zip?: string;
	street?: string;
};

/**
 * Latin letters only, lowercased: `Jean-Luc O'Neil` → `jeanluconeil`, `Пётр` → `petr`. `ae`, `oe`
 * and `ue` fold to their vowel, so `Müller` (→ `muller`) and `Mueller`, the way umlauts are
 * written where a keyboard lacks them, come out the same; both sides fold alike, so this never
 * pulls two different names apart.
 */
function letters(value: string): string {
	return anyAscii(value)
		.toLowerCase()
		.replace(/[^a-z]/g, '')
		.replace(/([aou])e/g, '$1');
}

/** Where a number written without its country code is read as being from. */
function defaultRegion(profile: MatchProfile): CountryCode {
	const alpha2 = profile.country ? alpha3ToAlpha2(profile.country) : undefined;
	return alpha2 && isSupportedCountry(alpha2) ? alpha2 : 'DE';
}

function e164(value: string, region: CountryCode): string | undefined {
	const parsed = parsePhoneNumberFromString(value, region);
	return parsed?.isValid() ? parsed.number : undefined;
}

/** `max.muster+mun@gmail.com` → `maxmuster`: the part a person picks, without tags and dots. */
function emailLocal(email: string): string | undefined {
	const local = email.toLowerCase().split('@')[0]?.split('+')[0]?.replace(/\./g, '') ?? '';
	return local.length >= MIN_EMAIL_LOCAL ? local : undefined;
}

export function matchKeys(profile: MatchProfile): MatchKeys {
	const region = defaultRegion(profile);
	const given = letters(profile.givenName);
	const family = letters(profile.familyName);
	const firstGiven = letters(profile.givenName.split(/[\s-]+/)[0] ?? '');
	const phone = profile.phone ? e164(profile.phone, region) : undefined;
	const emergencyPhones = new Set(
		findPhoneNumbersInText(profile.emergencyContacts ?? '', region)
			.map((found) => found.number.number)
			.filter((number) => number !== phone)
	);
	const street = profile.street ? anyAscii(profile.street).toLowerCase().replace(/\W/g, '') : '';
	return {
		id: profile.id,
		given: [...new Set([given, firstGiven])],
		family,
		birthday: profile.birthday?.toISOString().slice(0, 10),
		emailLocal: emailLocal(profile.email),
		phone,
		emergencyPhones,
		zip: profile.zip?.replace(/\s/g, '').toUpperCase() || undefined,
		street: street || undefined
	};
}

// Reused by every call (a scan makes millions): which characters of each side found a match.
let aMatched = new Uint8Array(64);
let bMatched = new Uint8Array(64);

/** The characters of `b` that `a`'s find within Jaro's window, marked in the two buffers. */
function markMatches(a: string, b: string): number {
	if (aMatched.length < a.length) aMatched = new Uint8Array(a.length);
	if (bMatched.length < b.length) bMatched = new Uint8Array(b.length);
	aMatched.fill(0, 0, a.length);
	bMatched.fill(0, 0, b.length);
	const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
	let matches = 0;
	for (let i = 0; i < a.length; i++) {
		const to = Math.min(b.length - 1, i + window);
		for (let j = Math.max(0, i - window); j <= to; j++) {
			if (bMatched[j] || a[i] !== b[j]) continue;
			aMatched[i] = bMatched[j] = 1;
			matches++;
			break;
		}
	}
	return matches;
}

/** Matched characters that appear in a different order, as `markMatches` left them marked. */
function countTranspositions(a: string, b: string): number {
	let transpositions = 0;
	let k = 0;
	for (let i = 0; i < a.length; i++) {
		if (!aMatched[i]) continue;
		while (!bMatched[k]) k++;
		if (a[i] !== b[k]) transpositions++;
		k++;
	}
	return transpositions;
}

/** Jaro-Winkler similarity in [0, 1]. */
export function jaroWinkler(a: string, b: string): number {
	if (a === b) return a.length > 0 ? 1 : 0;
	if (!a || !b) return 0;
	const matches = markMatches(a, b);
	if (matches === 0) return 0;
	const transpositions = countTranspositions(a, b);
	const jaro =
		(matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
	let prefix = 0;
	while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
	return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * How alike two names are: given and family name each compared on their own, and the name only
 * as close as the less similar of the two - compared as one string, a long shared family name
 * would carry two siblings' different given names. Also tried the other way round, for a name
 * entered with the family name first.
 */
function nameSimilarity(a: MatchKeys, b: MatchKeys): number {
	let best = 0;
	for (const x of a.given) {
		for (const y of b.given) {
			const inOrder = Math.min(jaroWinkler(x, y), jaroWinkler(a.family, b.family));
			const swapped = Math.min(jaroWinkler(x, b.family), jaroWinkler(a.family, y));
			best = Math.max(best, inOrder, swapped);
		}
	}
	return best;
}

function sharesEmergencyPhone(a: MatchKeys, b: MatchKeys): boolean {
	if (a.phone && b.emergencyPhones.has(a.phone)) return true;
	if (b.phone && a.emergencyPhones.has(b.phone)) return true;
	for (const number of a.emergencyPhones) if (b.emergencyPhones.has(number)) return true;
	return false;
}

/** The reasons the cheap keys of two accounts give, each with its weight. */
function keyReasons(a: MatchKeys, b: MatchKeys): [MatchReason, number][] {
	const sameAddress =
		a.zip &&
		a.zip === b.zip &&
		a.street &&
		b.street &&
		jaroWinkler(a.street, b.street) >= STREET_SIMILAR;
	const candidates: [MatchReason, unknown][] = [
		['birthday', a.birthday && a.birthday === b.birthday],
		['email', a.emailLocal && a.emailLocal === b.emailLocal],
		['phone', a.phone && a.phone === b.phone],
		['emergencyContact', sharesEmergencyPhone(a, b)],
		['address', sameAddress]
	];
	return candidates.flatMap(([reason, hit]) => (hit ? [[reason, WEIGHTS[reason]]] : []));
}

/** How alike two accounts are, and why; `undefined` below `DUPLICATE_THRESHOLD`. */
export function compareKeys(
	a: MatchKeys,
	b: MatchKeys
): Omit<DuplicatePair, 'userId' | 'candidateId'> | undefined {
	const found = keyReasons(a, b);
	const reasons: MatchReason[] = found.map(([reason]) => reason);
	let score = found.reduce((sum, [, weight]) => sum + weight, 0);
	const add = (reason: MatchReason, weight: number) => {
		reasons.push(reason);
		score += weight;
	};

	// the names last, and only where they can still make the difference: most accounts a scan
	// compares share nothing but a birthday with strangers
	if (score + WEIGHTS.name >= DUPLICATE_THRESHOLD) {
		const name = nameSimilarity(a, b);
		if (name >= NAME_SIMILAR) add('name', WEIGHTS.name);
		else if (name >= NAME_CLOSE) add('name', WEIGHTS.nameClose);
	}

	if (score < DUPLICATE_THRESHOLD) return undefined;
	return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
}

/**
 * The values two accounts must share at least one of to reach the threshold at all - every
 * combination of weights that does includes one of them - so only accounts sharing one are
 * compared, rather than every account with every other.
 */
function blockingKeys(keys: MatchKeys): string[] {
	const result: string[] = [];
	if (keys.birthday) result.push(`b:${keys.birthday}`);
	if (keys.emailLocal) result.push(`e:${keys.emailLocal}`);
	if (keys.zip) result.push(`z:${keys.zip}`);
	for (const number of [keys.phone, ...keys.emergencyPhones])
		if (number) result.push(`p:${number}`);
	return result;
}

/**
 * The pool, indexed by `blockingKeys`. Built and matched against a part at a time, so a caller
 * can hand the event loop back in between: a scan of a conference with tens of thousands of
 * accounts takes seconds.
 */
export class DuplicateIndex {
	private readonly buckets = new Map<string, MatchKeys[]>();
	private readonly pairs = new Map<string, DuplicatePair>();

	add(pool: MatchProfile[]) {
		for (const keys of pool.map(matchKeys)) {
			for (const key of blockingKeys(keys)) {
				const bucket = this.buckets.get(key);
				if (bucket) bucket.push(keys);
				else this.buckets.set(key, [keys]);
			}
		}
	}

	/**
	 * Compares scanned accounts with the pool added so far. The pool may include them; an account
	 * is never paired with itself, and a pair found from both sides counts once.
	 */
	match(scanned: MatchProfile[]) {
		for (const keys of scanned.map(matchKeys)) {
			const compared = new Set<string>([keys.id]);
			for (const key of blockingKeys(keys)) {
				for (const other of this.buckets.get(key) ?? []) {
					if (compared.has(other.id)) continue;
					compared.add(other.id);
					this.compare(keys, other);
				}
			}
		}
	}

	private compare(keys: MatchKeys, other: MatchKeys) {
		const [userId, candidateId] = keys.id < other.id ? [keys.id, other.id] : [other.id, keys.id];
		const pairKey = `${userId}|${candidateId}`;
		if (this.pairs.has(pairKey)) return;
		const match = compareKeys(keys, other);
		if (match) this.pairs.set(pairKey, { userId, candidateId, ...match });
	}

	/** Every pair of a scanned account and a pool account that looks like one person. */
	found(): DuplicatePair[] {
		return [...this.pairs.values()];
	}
}

/** `DuplicateIndex` in one go, for inputs small enough not to need breaks. */
export function findDuplicates(scanned: MatchProfile[], pool: MatchProfile[]): DuplicatePair[] {
	const index = new DuplicateIndex();
	index.add(pool);
	index.match(scanned);
	return index.found();
}
