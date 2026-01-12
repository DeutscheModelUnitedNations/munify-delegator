<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from '../$types';
	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-4 xl:col-span-4">
	<div class="card-body p-4">
		<div class="stats bg-base-100 w-full">
			<div class="stat py-2 px-3">
				<div class="stat-figure">
					<i class="fa-duotone fa-hourglass-clock text-2xl text-base-content/70"></i>
				</div>
				<div class="stat-title text-xs">{m.daysUntilConference()}</div>
				<div class="stat-value text-xl">{stats?.countdowns?.daysUntilConference ?? '-'}</div>
			</div>
		</div>
	</div>
</section>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-4 xl:col-span-4">
	<div class="card-body p-4">
		<div class="stats bg-base-100 w-full">
			<div class="stat py-2 px-3">
				<div class="stat-figure">
					<i class="fa-duotone fa-check-to-slot text-2xl text-base-content/70"></i>
				</div>
				<div class="stat-title text-xs">{m.daysUntilEndRegistration()}</div>
				<div class="stat-value text-xl">{stats?.countdowns?.daysUntilEndRegistration ?? '-'}</div>
			</div>
		</div>
	</div>
</section>
