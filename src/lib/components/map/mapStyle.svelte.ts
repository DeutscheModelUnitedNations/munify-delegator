import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { MediaQuery } from 'svelte/reactivity';

// MapLibre 6 finds its worker next to its own module, which Vite's dependency pre-bundling (and a
// build) does not copy: without this every map stays grey. Every map imports this module.
setWorkerUrl(workerUrl);

// Basemap as in AirTrail: OpenFreeMap's vector styles, following the colour scheme.
const dark = new MediaQuery('prefers-color-scheme: dark');

export function mapStyle() {
	return dark.current
		? 'https://tiles.openfreemap.org/styles/dark'
		: 'https://tiles.openfreemap.org/styles/positron';
}
