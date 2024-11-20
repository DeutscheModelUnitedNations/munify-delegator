<script lang="ts">
	import {
		assignNationToDelegation,
		getDelegationApplication,
		getDelegationApplications,
		getNations,
		getRemainingSeats,
		resetSeatCategory,
		unassignNationFromDelegation,
		type Nation
	} from './appData.svelte';
	import DelegationCard from './DelegationCard.svelte';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import NationCard from './NationCard.svelte';
	import { autoAssign } from './autoAssign.svelte';

	let largestApplication = $derived(() =>
		Math.max(...getDelegationApplications().map((application) => application.members.length))
	);

	let largestNation = $derived(() => Math.max(...getNations().map((nation) => nation.seats)));

	const countNationsWithXSeats = (x: number) =>
		getNations().filter((nation) => nation.seats === x).length;
	const countApplicationsWithXMembers = (x: number) =>
		getDelegationApplications().filter((application) => application.members.length === x).length;

	function handleDrop(state: DragDropState<{ id: string }>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer || !draggedItem.id) return;

		if (sourceContainer === 'delegationApplications' && targetContainer.startsWith('nations')) {
			const alpha3Code = targetContainer.split('-')[1];
			const nation = getNations().find((x) => x.nation.alpha3Code === alpha3Code)?.nation;
			if (!alpha3Code || !nation) return;
			if (
				getRemainingSeats(nation) -
					(getDelegationApplication(draggedItem.id)?.members.length ?? 0) <
				0
			) {
				alert('Not enough seats');
				return;
			}
			assignNationToDelegation(draggedItem.id, alpha3Code);
		}

		if (sourceContainer.startsWith('nations') && targetContainer === 'delegationApplications') {
			unassignNationFromDelegation(draggedItem.id);
		}
	}

	const getAssignedDelegationsForNation = (nation: Nation) => {
		return getDelegationApplications().filter(
			(x) => x.assignedNation?.alpha3Code === nation.alpha3Code
		);
	};
</script>

<div class="flex w-full gap-6">
	<div class="flex w-1/2 flex-1 flex-col-reverse justify-end">
		{#each { length: largestNation() - 1 } as _, i}
			<div class="mb-10 flex flex-col gap-2">
				<div class="flex items-center gap-4">
					<h2 class="font-bold">{i + 2} Plätze ({countNationsWithXSeats(i + 2)}x)</h2>
					<button
						class="btn btn-ghost btn-sm w-fit"
						onclick={() => {
							resetSeatCategory(i + 2);
						}}>Kategorie zurücksetzen</button
					>
				</div>
				<div class="flex flex-row flex-wrap gap-2">
					{#each getNations().filter((x) => x.seats === i + 2) as nation}
						<div
							class="transition-all duration-300"
							use:droppable={{
								container: `nations-${nation.nation.alpha3Code}`,
								callbacks: { onDrop: handleDrop },
								attributes: { draggingClass: 'scale-105' }
							}}
						>
							<NationCard
								nation={nation.nation}
								committees={nation.committees}
								emptySeats={getRemainingSeats(nation.nation)}
							>
								{#if getAssignedDelegationsForNation(nation.nation)}
									{#each getAssignedDelegationsForNation(nation.nation) as application}
										<div
											use:draggable={{
												container: `nations-${nation.nation.alpha3Code}`,
												dragData: { id: application.id }
											}}
											class="cursor-grab"
										>
											<DelegationCard {application} />
										</div>
									{/each}
								{/if}
							</NationCard>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<div class="w-1 rounded-full bg-base-300"></div>
	<div
		class="flex flex-1 flex-col-reverse justify-end"
		use:droppable={{ container: 'delegationApplications', callbacks: { onDrop: handleDrop } }}
	>
		{#each { length: largestApplication() - 1 } as _, i}
			<div class="mb-10 flex flex-col gap-2">
				<div class="flex items-center gap-4">
					<h2 class="font-bold">{i + 2} Plätze ({countApplicationsWithXMembers(i + 2)}x)</h2>
					<button
						class="btn btn-ghost btn-sm w-fit"
						onclick={() => {
							autoAssign(i + 2);
						}}>Auto-Zuteilung</button
					>
				</div>
				<div class="flex flex-row flex-wrap gap-2">
					{#each getDelegationApplications().filter((x) => x.members.length === i + 2 && !x.assignedNation) as application}
						<div
							use:draggable={{
								container: 'delegationApplications',
								dragData: { id: application.id }
							}}
							class="cursor-grab"
						>
							<DelegationCard {application} />
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
