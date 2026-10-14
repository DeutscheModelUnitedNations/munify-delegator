<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import NumberMatrix from './NumberMatrix.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			diet: {
				delegationMembers: { omnivore: true, vegetarian: true, vegan: true },
				singleParticipants: { omnivore: true, vegetarian: true, vegan: true },
				supervisors: { omnivore: true, vegetarian: true, vegan: true },
				teamMembers: { omnivore: true, vegetarian: true, vegan: true }
			}
		})
	);
	let diet = $derived(stats.diet);

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
