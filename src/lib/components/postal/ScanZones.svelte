<!--
	@component
	Where the fields of a scanned page are read, laid over its picture: green where the scan's readings
	say a field is ticked or written in, in the warning colour where not (empty, unclear, not read).
	The zones are looked for again on the kept file, which is the file they were read off.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { fieldLabel } from '#lib/paperScan/fieldLabels';
	import { scanZones } from '#lib/paperScan/intake/pages';
	import type { FieldState } from '#lib/paperScan/readPaper';
	import { browserPlatform } from './browserScan';
	import { isDetected, pointsOf } from './scanPreview';

	interface Props {
		picture: ImageData;
		readings: Map<string, FieldState>;
	}

	let { picture, readings }: Props = $props();

	const zones = $derived(await scanZones({ picture, readCodes: browserPlatform.readCodes }));

	const stateLabel: Record<FieldState, () => string> = {
		yes: () => m.agreementStateYes(),
		no: () => m.agreementStateNo(),
		unclear: () => m.agreementStateUnclear()
	};
</script>

{#if zones}
	<svg
		class="pointer-events-none absolute inset-0 h-full w-full"
		viewBox="0 0 {picture.width} {picture.height}"
		preserveAspectRatio="none"
		role="list"
		aria-label={m.postalScanZones()}
	>
		{#each zones as zone (zone.field)}
			{@const state = readings.get(zone.field)}
			<polygon
				role="listitem"
				points={pointsOf(zone)}
				vector-effect="non-scaling-stroke"
				stroke-width="2"
				class={isDetected(state)
					? 'fill-success/25 stroke-success'
					: 'fill-warning/25 stroke-warning'}
			>
				<title>
					{m.postalScanZone({
						field: fieldLabel[zone.field](),
						state: state ? stateLabel[state]() : m.agreementStateUnknown()
					})}
				</title>
			</polygon>
		{/each}
	</svg>
{:else}
	<p class="badge badge-warning absolute top-2 left-2">{m.postalScanZonesNone()}</p>
{/if}
