<script lang="ts">
	import AreaMap from './AreaMap.svelte';
	import { mapAreas } from './mapAreas';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	// The server groups by three-digit ZIP area and resolves each area's (or country's) centre.
	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			addresses: {
				country: true,
				zipPrefix: true,
				lat: true,
				lng: true,
				atCountryCentre: true,
				count: true
			}
		})
	);
	const areas = $derived(mapAreas(stats.addresses));
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i aria-hidden="true" class="ph-duotone ph-map-trifold text-base-content/70"></i>
			{m.statsGeographicDistribution()}
		</h2>
		<AreaMap {areas} />
	</div>
</section>
