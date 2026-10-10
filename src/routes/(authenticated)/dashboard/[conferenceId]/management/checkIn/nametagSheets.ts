import { client } from '$lib/api/rumbleClient/client';
import { flagPng, iconPng, urlToPng } from '$lib/api/nametagSheetImages';
import type { NametagSheet, NametagSheetEntry } from '$lib/api/nametagSheetsPdf';
import { m } from '$lib/paraglide/messages';
import outfitRegularUrl from '@fontsource/outfit/files/outfit-latin-400-normal.woff?url';
import outfitBoldUrl from '@fontsource/outfit/files/outfit-latin-700-normal.woff?url';

interface Bin {
	index: number;
	fromLetter: string | null;
	toLetter: string | null;
	participants: number;
}

interface Group {
	nationAlpha3Code: string | null;
	nationAlpha2Code: string | null;
	roleName: string | null;
	sortName: string;
	fontAwesomeIcon: string | null;
}

type SortedEntry = NametagSheetEntry & { sortName: string };

/** The letters one table covers: "A", "A – H", or `null` when it holds no nation. */
export function letterRange(bin: Pick<Bin, 'fromLetter' | 'toLetter'>) {
	const { fromLetter, toLetter } = bin;
	if (!fromLetter || !toLetter) return null;
	return fromLetter === toLetter ? fromLetter : `${fromLetter} – ${toLetter}`;
}

/** The tables alternate in colour, so neighbours tell apart. */
export function binTone(index: number) {
	return index % 2 === 0
		? { bar: 'bg-primary', badge: 'badge-primary' }
		: { bar: 'bg-secondary', badge: 'badge-secondary' };
}

/** The conference's name and logo and the fonts every sheet is set in. */
export async function loadSheetAssets(conferenceId: string) {
	const [conference, regular, bold] = await Promise.all([
		client.query.conference({
			__args: { id: conferenceId },
			title: true,
			logoUrl: true,
			emblemUrl: true
		}),
		fetch(outfitRegularUrl).then((response) => response.arrayBuffer()),
		fetch(outfitBoldUrl).then((response) => response.arrayBuffer())
	]);
	const logoSource = conference.logoUrl ?? conference.emblemUrl;
	return {
		conferenceTitle: conference.title,
		logo: logoSource ? await urlToPng(logoSource) : null,
		fonts: { regular, bold }
	};
}

/** Draws each flag or icon once, however many tables show it. */
function imageCache() {
	const flags = new Map<string, Promise<Uint8Array | null>>();
	const icons = new Map<string, Promise<Uint8Array>>();
	return {
		flagOf(alpha2Code: string) {
			const known = flags.get(alpha2Code) ?? flagPng(alpha2Code);
			flags.set(alpha2Code, known);
			return known;
		},
		iconOf(icon: string | null) {
			const key = icon ?? '';
			const known = icons.get(key) ?? iconPng(icon);
			icons.set(key, known);
			return known;
		}
	};
}

type Images = ReturnType<typeof imageCache>;

// by the name the letters are cut by, so a sign reads in the order of its range
const bySortName = (a: SortedEntry, b: SortedEntry) => a.sortName.localeCompare(b.sortName);

async function nationEntry(group: Group, images: Images): Promise<SortedEntry | null> {
	if (!group.nationAlpha3Code) return null;
	return {
		label: group.sortName,
		sortName: group.sortName,
		image: group.nationAlpha2Code ? await images.flagOf(group.nationAlpha2Code) : null
	};
}

async function otherEntry(group: Group, images: Images): Promise<SortedEntry | null> {
	if (group.nationAlpha3Code || !group.roleName) return null;
	return {
		label: group.roleName,
		sortName: group.sortName,
		image: await images.iconOf(group.fontAwesomeIcon)
	};
}

async function sortedEntries(
	groups: Group[],
	entryOf: (group: Group, images: Images) => Promise<SortedEntry | null>,
	images: Images
) {
	const entries = await Promise.all(groups.map((group) => entryOf(group, images)));
	return entries.filter((entry) => entry !== null).sort(bySortName);
}

/** One table's sign: the letters big, the nations below and, if there are any, the others. */
function sheetOf(bin: Bin, nations: NametagSheetEntry[], others: NametagSheetEntry[]) {
	const range = letterRange(bin);
	const sheet: NametagSheet = {
		tableLabel: `${m.nametagBinTable()} ${bin.index + 1}`,
		title: range ?? m.nametagBinOthers(),
		sections: [{ entries: nations }]
	};
	if (others.length > 0) {
		sheet.sections.push({ heading: range ? m.nametagBinOthers() : undefined, entries: others });
	}
	return sheet;
}

/** One sign per table that holds anybody. */
export async function buildSheets(conferenceId: string, binCount: number, bins: Bin[]) {
	const images = imageCache();
	const sheets: NametagSheet[] = [];
	for (const bin of bins.filter((bin) => bin.participants > 0)) {
		const groups = await client.query.nametagBinGroups({
			__args: { conferenceId, binCount, index: bin.index },
			nationAlpha3Code: true,
			nationAlpha2Code: true,
			roleName: true,
			sortName: true,
			fontAwesomeIcon: true
		});
		const nations = await sortedEntries(groups, nationEntry, images);
		const others = await sortedEntries(groups, otherEntry, images);
		sheets.push(sheetOf(bin, nations, others));
	}
	return sheets;
}
