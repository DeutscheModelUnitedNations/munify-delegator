/** Plus Code (Open Location Code) utilities for the place form. */
const PLUS_CODE_ALPHABET = '23456789CFGHJMPQRVWX';

/** Decode a full Plus Code (8 chars before '+') to lat/lng center. */
export function decodePlusCodeFull(code: string): { latitude: number; longitude: number } | null {
	const cleaned = code.toUpperCase().replace(/0+\+$/, '+');
	const sepIdx = cleaned.indexOf('+');
	if (sepIdx !== 8) return null;
	const stripped = cleaned.replace('+', '');
	for (const ch of stripped) {
		if (ch !== '0' && !PLUS_CODE_ALPHABET.includes(ch)) return null;
	}
	const pairs = Math.min(stripped.length, 10);
	let lat = 0;
	let lng = 0;
	let latRes = 400;
	let lngRes = 400;
	for (let i = 0; i < pairs; i += 2) {
		latRes /= 20;
		lngRes /= 20;
		lat += PLUS_CODE_ALPHABET.indexOf(stripped[i]) * latRes;
		lng += PLUS_CODE_ALPHABET.indexOf(stripped[i + 1]) * lngRes;
	}
	if (stripped.length > 10) {
		for (let i = 10; i < stripped.length; i++) {
			const row = Math.floor(PLUS_CODE_ALPHABET.indexOf(stripped[i]) / 4);
			const col = PLUS_CODE_ALPHABET.indexOf(stripped[i]) % 4;
			latRes /= 5;
			lngRes /= 4;
			lat += row * latRes;
			lng += col * lngRes;
		}
	}
	return { latitude: lat + latRes / 2 - 90, longitude: lng + lngRes / 2 - 180 };
}

/** Encode lat/lng to a 10-digit full Plus Code. */
function encodePlusCode(lat: number, lng: number): string {
	lat = Math.min(90, Math.max(-90, lat));
	lng = (((lng % 360) + 540) % 360) - 180;
	let adjLat = Math.min(lat + 90, 180 - 1e-10);
	let adjLng = lng + 180;
	let code = '';
	let pv = 20;
	for (let i = 0; i < 5; i++) {
		const latIdx = Math.min(Math.floor(adjLat / pv), 19);
		const lngIdx = Math.min(Math.floor(adjLng / pv), 19);
		adjLat -= latIdx * pv;
		adjLng -= lngIdx * pv;
		code += PLUS_CODE_ALPHABET[latIdx] + PLUS_CODE_ALPHABET[lngIdx];
		pv /= 20;
	}
	return code.substring(0, 8) + '+' + code.substring(8);
}

/** Recover a full Plus Code from a short code + reference coordinates. */
export function recoverPlusCode(shortCode: string, refLat: number, refLng: number): string {
	const sepIdx = shortCode.indexOf('+');
	const paddingLen = 8 - sepIdx;
	const resolution = Math.pow(20, 2 - sepIdx / 2);
	const halfRes = resolution / 2;

	const refCode = encodePlusCode(refLat, refLng);
	const candidate = refCode.substring(0, paddingLen) + shortCode;

	const decoded = decodePlusCodeFull(candidate);
	if (!decoded) return candidate;

	let { latitude: cLat, longitude: cLng } = decoded;
	if (refLat + halfRes < cLat && cLat - resolution >= -90) cLat -= resolution;
	else if (refLat - halfRes > cLat && cLat + resolution <= 90) cLat += resolution;
	if (refLng + halfRes < cLng) cLng -= resolution;
	else if (refLng - halfRes > cLng) cLng += resolution;

	return encodePlusCode(cLat, cLng);
}
