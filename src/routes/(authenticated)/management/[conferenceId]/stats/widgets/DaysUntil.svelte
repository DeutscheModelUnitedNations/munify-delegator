<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let stats = $derived(data.stats);
</script>

<section
	class="stats stats-vertical col-span-2 bg-base-200 shadow-sm xl:stats-horizontal sm:col-span-1 md:col-span-6"
>
	<div class="stat">
		<div class="stat-figure"><i class="fa-duotone fa-hourglass-clock text-3xl"></i></div>
		<div class="stat-title">{m.daysUntilConference()}</div>
		<div class="stat-value">{stats?.countdowns.daysUntilConference}</div>
	</div>
</section>
<section
	class="stats stats-vertical col-span-2 bg-base-200 shadow-sm xl:stats-horizontal sm:col-span-1 md:col-span-6"
>
	<div class="stat">
		<div class="stat-figure"><i class="fa-duotone fa-check-to-slot text-3xl"></i></div>
		<div class="stat-title">{m.daysUntilEndRegistration()}</div>
		<div class="stat-value">{stats?.countdowns.daysUntilEndRegistration || '-'}</div>
	</div>
</section>
