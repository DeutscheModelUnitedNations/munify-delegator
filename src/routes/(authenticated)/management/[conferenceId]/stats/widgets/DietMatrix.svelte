<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from '../$types';
	import NumberMatrix from './NumberMatrix.svelte';
	let props: { data: PageData } = $props();
	let diet = $derived(props.data.stats.diet);

	let matrixData = $derived.by(() => {
		return [
			[
				diet.delegationMembers.omnivore,
				diet.delegationMembers.vegetarian,
				diet.delegationMembers.vegan
			],
			[
				diet.singleParticipants.omnivore,
				diet.singleParticipants.vegetarian,
				diet.singleParticipants.vegan
			],
			[diet.supervisors.omnivore, diet.supervisors.vegetarian, diet.supervisors.vegan],
			[diet.teamMembers.omnivore, diet.teamMembers.vegetarian, diet.teamMembers.vegan]
		];
	});
</script>

<NumberMatrix
	data={matrixData}
	xLabels={[m.omnivore(), m.vegetarian(), m.vegan()]}
	yLabels={[m.delegationMembers(), m.singleParticipants(), m.supervisors(), m.teamMembers()]}
	title={m.diet()}
/>
