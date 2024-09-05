<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import PlainCard from '$lib/components/PlainCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import IconPicker from '$lib/components/IconPicker.svelte';

	let { data }: { data: PageData } = $props();

	// const testData = [
	// 	{
	// 		roleId: 1,
	// 		role: 'Konferenzpresse',
	// 		description: 'Du berichtest als Journalist*in über die Konferenz und die Debatten.',
	// 		icon: 'fa-newspaper'
	// 	},
	// 	{
	// 		roleId: 2,
	// 		role: 'Richter*in am IGH',
	// 		description:
	// 			'Du besteigst die Richterbank und entscheidest über einen internationalen Rechtsfall.',
	// 		icon: 'fa-gavel'
	// 	},
	// 	{
	// 		roleId: 3,
	// 		role: 'Prozessbevollmächtigte*r A',
	// 		description: 'Du vertrittst die Interessen von A vor dem Internationalen Gerichtshof.',
	// 		icon: 'fa-balance-scale'
	// 	},
	// 	{
	// 		roleId: 4,
	// 		role: 'Prozessbevollmächtigte*r B',
	// 		description: 'Du vertrittst die Interessen von B vor dem Internationalen Gerichtshof.',
	// 		icon: 'fa-balance-scale'
	// 	}
	// ];
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.individualApplication()}</h1>
		<p class="max-ch-md">
			{m.individualApplicationDescription2()}
		</p>
		<a class="btn btn-warning mt-6" href=".">{m.back()}</a>
	</hero>

	<main>
		<IconPicker />

		<section class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
			<!-- {#each data.availableCustomConferenceRoles as { description, fontAwesomeIcon, id, name }}
				<PlainCard title={name} {description} {fontAwesomeIcon} link={`./individual/${id}`} />
			{/each} -->
		</section>
	</main>
</div>
