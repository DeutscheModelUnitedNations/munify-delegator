<!--
	@component
	A kept scan, large, drawn as it is read, with where its fields are read laid over it (`ScanZones`),
	which can be hidden to see what is under them.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import ScanZones from './ScanZones.svelte';
	import { drawPicture, loadScanPicture, readingsByField } from './scanPreview';

	interface Props {
		url: string;
		name: string;
		/** The scan's stored readings (JSON) */
		readings: unknown;
	}

	let { url, name, readings }: Props = $props();

	const picture = $derived(await loadScanPicture({ url }));
	const byField = $derived(readingsByField(readings));
	let showZones = $state(true);
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
		<label class="flex cursor-pointer items-center gap-2">
			<input type="checkbox" class="toggle toggle-sm" bind:checked={showZones} />
			{m.postalScanZonesShow()}
		</label>
		<span class="flex items-center gap-2">
			<span aria-hidden="true" class="border-success bg-success/25 size-3 rounded-sm border"></span>
			{m.postalScanZoneDetected()}
		</span>
		<span class="flex items-center gap-2">
			<span aria-hidden="true" class="border-warning bg-warning/25 size-3 rounded-sm border"></span>
			{m.postalScanZoneNotDetected()}
		</span>
	</div>
	<figure class="relative mx-auto w-fit" aria-label={name}>
		<canvas
			class="block h-auto max-h-[75dvh] w-auto max-w-full"
			aria-hidden="true"
			{@attach drawPicture(picture)}
		></canvas>
		{#if showZones}
			<svelte:boundary>
				<ScanZones {picture} readings={byField} />
				{#snippet pending()}
					<p class="badge absolute top-2 left-2 gap-2">
						<span class="loading loading-spinner loading-xs"></span>
						{m.postalScanZonesSearching()}
					</p>
				{/snippet}
				{#snippet failed()}
					<p class="badge badge-warning absolute top-2 left-2">{m.postalScanZonesNone()}</p>
				{/snippet}
			</svelte:boundary>
		{/if}
	</figure>
</div>
