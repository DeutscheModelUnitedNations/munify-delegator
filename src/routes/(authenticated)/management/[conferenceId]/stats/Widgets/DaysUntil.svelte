<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getStats } from '../stats.svelte';

	let stats = getStats();
</script>

<section
	class="col-span-2 sm:col-span-1 md:col-span-6 stats stats-vertical xl:stats-horizontal bg-base-200 shadow-sm"
>
	<div class="stat">
		<div class="stat-figure"><i class="fa-duotone fa-hourglass-clock text-3xl"></i></div>
		<div class="stat-title">{m.daysUntilConference()}</div>
		<div class="stat-value">{stats?.countdowns.daysUntilConference}</div>
	</div>
</section>
<section
	class="col-span-2 sm:col-span-1 md:col-span-6 stats stats-vertical xl:stats-horizontal bg-base-200 shadow-sm"
>
	<div class="stat">
		<div class="stat-figure"><i class="fa-duotone fa-check-to-slot text-3xl"></i></div>
		<div class="stat-title">{m.daysUntilEndRegistration()}</div>
		<div class="stat-value">{stats?.countdowns.daysUntilEndRegistration}</div>
	</div>
</section>
