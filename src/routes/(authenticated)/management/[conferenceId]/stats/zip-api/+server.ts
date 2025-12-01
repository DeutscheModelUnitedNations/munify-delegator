import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// CSV einlesen
const csvFilePath = path.resolve('static/plz.csv');
const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
}) as { lat: string; lng: string; zip: string }[];

console.log(records.slice(0, 5));


// CSV in ein Map für schnelle Suche umwandeln
const zipMap = new Map<string, { lat: number; lng: number }>();
for (const r of records) {
  if (r.zip && r.lat && r.lng) {
    zipMap.set(r.zip.trim(), { lat: parseFloat(r.lat), lng: parseFloat(r.lng) });
  }
}

// Funktion für mehrere PLZ
function getCoordinatesForZips(zips: string[]) {
  return zips.map(zip => {
    const coords = zipMap.get(zip.trim());
    if (!coords) return { zip, error: 'not found' };
    return { zip, ...coords };
  });
}

// POST-Handler
export const POST = async ({ request }) => {
  const body = await request.json();
  const zips = body
  .map((item: { zip?: string }) => item.zip)
  .filter((zip): zip is string => typeof zip === 'string' && zip.trim() !== '');


  //console.log(`Fetching locations for ${zips.join(', ')} (local CSV)`);

  const results = getCoordinatesForZips(zips);

	//console.log(results);
  return new Response(JSON.stringify(results), { status: 200 });
};
