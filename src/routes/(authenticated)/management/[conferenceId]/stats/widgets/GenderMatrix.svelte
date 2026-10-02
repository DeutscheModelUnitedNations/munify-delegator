<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import NumberMatrix from './NumberMatrix.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.liveQuery.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			gender: {
				delegationMembers: { male: true, female: true, diverse: true, noStatement: true },
				singleParticipants: { male: true, female: true, diverse: true, noStatement: true },
				supervisors: { male: true, female: true, diverse: true, noStatement: true },
				teamMembers: { male: true, female: true, diverse: true, noStatement: true }
			}
		})
	);
	let genderData = $derived(stats.gender);

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
