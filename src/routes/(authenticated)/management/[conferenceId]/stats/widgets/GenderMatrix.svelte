<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from '../$types';
	import NumberMatrix from './NumberMatrix.svelte';
	let { data }: { data: PageData } = $props();
	let genderData = $derived(data.stats.gender);

	let matrixData = $derived.by(() => {
		return [
			[
				genderData.delegationMembers.male,
				genderData.delegationMembers.female,
				genderData.delegationMembers.diverse,
				genderData.delegationMembers.noStatement
			],
			[
				genderData.singleParticipants.male,
				genderData.singleParticipants.female,
				genderData.singleParticipants.diverse,
				genderData.singleParticipants.noStatement
			],
			[
				genderData.supervisors.male,
				genderData.supervisors.female,
				genderData.supervisors.diverse,
				genderData.supervisors.noStatement
			],
			[
				genderData.teamMembers.male,
				genderData.teamMembers.female,
				genderData.teamMembers.diverse,
				genderData.teamMembers.noStatement
			]
		];
	});
</script>

<NumberMatrix
	data={matrixData}
	xLabels={[m.male(), m.female(), m.diverse(), m.noStatement()]}
	yLabels={[m.delegationMembers(), m.singleParticipants(), m.supervisors(), m.teamMembers()]}
	title={m.gender()}
/>
