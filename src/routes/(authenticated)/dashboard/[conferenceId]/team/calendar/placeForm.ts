import { client } from '#lib/api/rumbleClient/client';
import { decodePlusCodeFull, recoverPlusCode } from './plusCode';

/** Why a plus code could not be placed: not a code, a short code without a city, an unknown city. */
export type PlusCodeError = 'invalid' | 'short' | 'cityNotFound';

type Position = { latitude: number; longitude: number };

/** The code (up to its first space) and, after it, an optional city a short code is relative to. */
const PLUS_CODE = /^([23456789CFGHJMPQRVWXcfghjmpqrvwx0]+\+[23456789CFGHJMPQRVWXcfghjmpqrvwx0]*)/;

const located = (position: Position | null): Position | { error: PlusCodeError } =>
	position ?? { error: 'invalid' };

/**
 * Where a plus code points: a full code is decoded directly, a short one ("9G8F+6X Zürich") is
 * recovered from the position of the city named after it, which `lookUpCity` finds.
 */
export async function resolvePlusCode({
	input,
	lookUpCity = lookUpCityOnNominatim
}: {
	input: string;
	lookUpCity?: (city: string) => Promise<Position | undefined>;
}): Promise<Position | { error: PlusCodeError }> {
	const codeMatch = input.match(PLUS_CODE);
	if (!codeMatch) return { error: 'invalid' };
	const code = codeMatch[1].toUpperCase();
	if (code.indexOf('+') === 8) return located(decodePlusCodeFull(code));

	const city = input.substring(codeMatch[0].length).trim();
	if (!city) return { error: 'short' };
	const reference = await lookUpCity(city);
	if (!reference) return { error: 'cityNotFound' };
	return located(
		decodePlusCodeFull(
			recoverPlusCode({ shortCode: code, refLat: reference.latitude, refLng: reference.longitude })
		)
	);
}

/** The position of a city, from OpenStreetMap's Nominatim; undefined when it knows none. */
async function lookUpCityOnNominatim(city: string): Promise<Position | undefined> {
	const response = await fetch(
		`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
		{ headers: { 'User-Agent': 'MUNify-Delegator' } }
	);
	if (!response.ok) return undefined;
	const data: { lat: string; lon: string }[] = await response.json();
	const first = data.at(0);
	return first && { latitude: parseFloat(first.lat), longitude: parseFloat(first.lon) };
}

/** The place form's inputs, as typed. */
export interface PlaceFormValues {
	name: string;
	address: string;
	latitude: string;
	longitude: string;
	directions: string;
	info: string;
	websiteUrl: string;
}

/** The fields a place is saved with: empty inputs are stored as none, coordinates as numbers. */
export function placeFields({
	values,
	sitePlanFileId
}: {
	values: PlaceFormValues;
	sitePlanFileId: string | undefined;
}) {
	return {
		name: values.name,
		address: values.address || null,
		latitude: values.latitude ? parseFloat(values.latitude) : null,
		longitude: values.longitude ? parseFloat(values.longitude) : null,
		directions: values.directions || null,
		info: values.info || null,
		websiteUrl: values.websiteUrl || null,
		sitePlanFileId
	};
}

/** Updates the place, or creates one in the conference when there is none to update yet. */
export async function savePlaceFields({
	conferenceId,
	placeId,
	fields
}: {
	conferenceId: string;
	placeId: string | undefined;
	fields: ReturnType<typeof placeFields>;
}) {
	if (placeId) {
		await client.mutate.updatePlace({ __args: { id: placeId, ...fields }, id: true });
	} else {
		await client.mutate.createPlace({ __args: { conferenceId, ...fields }, id: true });
	}
}
