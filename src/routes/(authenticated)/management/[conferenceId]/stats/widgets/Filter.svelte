<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { registrationFilter } from '../stats.svelte';

	let { getFilter, setFilter } = registrationFilter();
</script>

<section class="card col-span-2 grow bg-base-200 shadow-sm md:col-span-4 xl:col-span-3">
	<div class="card-body items-center justify-center">
		<fieldset class="fieldset">
			<div class="flex flex-col items-start justify-start">
				<label class="label cursor-pointer">
					<input
						type="radio"
						name="filter"
						class="radio checked:bg-primary"
						onchange={() => setFilter('all')}
						checked={getFilter() === 'all'}
					/>
					<span class="ml-2">{m.registrationsTotal()}</span>
				</label>
				<label class="label cursor-pointer">
					<input
						type="radio"
						name="filter"
						class="radio checked:bg-primary"
						onchange={() => setFilter('applied')}
						checked={getFilter() === 'applied'}
					/>
					<span class="ml-2">{m.registrationApplied()}</span>
				</label>
				<label class="label cursor-pointer">
					<input
						type="radio"
						name="filter"
						class="radio checked:bg-primary"
						onchange={() => setFilter('notApplied')}
						checked={getFilter() === 'notApplied'}
					/>
					<span class="ml-2">{m.registrationNotApplied()}</span>
				</label>
			</div>
		</fieldset>
	</div>
</section>
