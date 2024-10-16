<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { registrationFilter } from '../stats.svelte';

	let { getFilter, setFilter } = registrationFilter();
</script>

<section class="col-span-2 md:col-span-4 xl:col-span-3 card bg-base-200 grow shadow-sm">
	<div class="card-body justify-center items-center">
		<div class="flex flex-col justify-start items-start">
			<label class="label cursor-pointer">
				<input
					type="radio"
					name="filter"
					class="radio checked:bg-primary"
					onchange={() => setFilter('all')}
					checked={getFilter() === 'all'}
				/>
				<span class="label-text ml-2">{m.registrationsTotal()}</span>
			</label>
			<label class="label cursor-pointer">
				<input
					type="radio"
					name="filter"
					class="radio checked:bg-primary"
					onchange={() => setFilter('applied')}
					checked={getFilter() === 'applied'}
				/>
				<span class="label-text ml-2">{m.registrationApplied()}</span>
			</label>
			<label class="label cursor-pointer">
				<input
					type="radio"
					name="filter"
					class="radio checked:bg-primary"
					onchange={() => setFilter('notApplied')}
					checked={getFilter() === 'notApplied'}
				/>
				<span class="label-text ml-2">{m.registrationNotApplied()}</span>
			</label>
		</div>
	</div>
</section>
