<script lang="ts">
	import {
		assignNationToDelegation,
		assignNSAToDelegation,
		getDelegationApplication,
		getDelegationApplications,
		getNations,
		getNSAs,
		getRemainingSeats,
		resetSeatCategory,
		unassignNationOrNSAFromDelegation,
		type Nation,
		type NonStateActor
	} from './appData.svelte';
	import DelegationCard from './DelegationCard.svelte';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import NationCard from './NationCard.svelte';
	import { autoAssign } from './autoAssign.svelte';
	import SizeTabs from './SizeTabs.svelte';
	import PartitionModal from './PartitionModal.svelte';
	import TextPreview from '$lib/components/TextPreview.svelte';

	let dragging = $state(false);
	let optionsModalOpen = $state<string | undefined>(undefined);

	let largestApplication = $derived(() =>
		Math.max(...getDelegationApplications().map((application) => application.members.length))
	);

	let largestNation = $derived(() => Math.max(...getNations().map((nation) => nation.seats)));
	let largestNSA = $derived(() => Math.max(...getNSAs().map((nation) => nation.seatAmount)));
	let largestNationOrNSA = $derived(() => Math.max(largestNation(), largestNSA()));

	let delegationTab = $state(2);
	let nationTab = $state(2);

	const countNationsWithXSeats = (x: number) =>
		getNations().filter((nation) => nation.seats === x).length;
	const countApplicationsWithXMembers = (x: number) =>
		getDelegationApplications().filter((application) => application.members.length === x).length;

	function handleDrop(state: DragDropState<{ id: string }>) {
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer || !draggedItem.id) return;

		if (targetContainer === 'options') {
			optionsModalOpen = draggedItem.id;
			return;
		}

		if (
			(sourceContainer === 'delegationApplications' && targetContainer.startsWith('nations')) ||
			targetContainer.startsWith('nsa')
		) {
			const identifier = targetContainer.split('-')[1];
			const nation = getNations().find((x) => x.nation.alpha3Code === identifier)?.nation;
			const nsa = getNSAs().find((x) => x.id === identifier);
			if (!identifier) return;
			if (nation) {
				if (
					getRemainingSeats(nation) -
						(getDelegationApplication(draggedItem.id)?.members.length ?? 0) <
					0
				) {
					alert('Not enough seats');
					return;
				}
				assignNationToDelegation(draggedItem.id, identifier);
			} else if (nsa) {
				assignNSAToDelegation(draggedItem.id, identifier);
			}
		}

		if (
			(sourceContainer.startsWith('nations') || sourceContainer.startsWith('nsa')) &&
			(targetContainer.startsWith('nations') || targetContainer.startsWith('nsa'))
		) {
			unassignNationOrNSAFromDelegation(draggedItem.id);

			const identifier = targetContainer.split('-')[1];
			const nation = getNations().find((x) => x.nation.alpha3Code === identifier)?.nation;
			const nsa = getNSAs().find((x) => x.id === identifier);
			if (!identifier) return;
			if (nation) {
				if (
					getRemainingSeats(nation) -
						(getDelegationApplication(draggedItem.id)?.members.length ?? 0) <
					0
				) {
					alert('Not enough seats');
					return;
				}
				assignNationToDelegation(draggedItem.id, identifier);
			} else if (nsa) {
				assignNSAToDelegation(draggedItem.id, identifier);
			}
		}

		if (
			(sourceContainer.startsWith('nations') || sourceContainer.startsWith('nsa')) &&
			targetContainer === 'delegationApplications'
		) {
			unassignNationOrNSAFromDelegation(draggedItem.id);
		}
	}

	const getAssignedDelegationsForNation = (nation: Nation) => {
		return getDelegationApplications().filter(
			(x) => x.assignedNation?.alpha3Code === nation.alpha3Code
		);
	};

	const getAssignedDelegationsForNSA = (nsa: NonStateActor) => {
		return getDelegationApplications().filter((x) => x.assignedNSA?.id === nsa.id);
	};
</script>

<TextPreview>
	<h2>Delegationszuteilung</h2>
	<p>
		Hier kann nun die eigentliche Delegationszuteilung durchgeführt werden. Die Delegationszuteilung
		erfolgt entweder automatisiert, indem auf den "Auto-Zuteilung"-Button in der jeweiligen
		Größenkategorie geklickt wird, oder manuell per Drag-and-Drop.
	</p>
	<p>
		<strong>
			Es ist unbedingt sinnvoll, bei der automatischen Zuteilung mit der größten Delegationsgröße
			anzufangen!
		</strong>
		Das hat den einfachen Grund, dass die kleineren Delegationen sonst nach oben auffüllen und ggf. den
		größeren Delegationen die Plätze wegnehmen.
	</p>
	<p>
		Delegationen können in mehrere kleinere Delegationen aufgeteilt werden, indem sie auf das
		Zerteilen-Symbol am unteren Bildschirmrand gezogen werden. Es ist auch möglich, Delegationen
		zusammenzuführen, indem sie auf das selbe Rollen-Feld gezogen werden (vorausgesetzt, es ist
		genug Platz in der Delegation vorhanden – für NAs gibt es keine Obergrenze).
	</p>
	<p>
		Delegationen, die ihren Wunsch nicht erfüllt bekommen haben, werden mit einem roten Schatten
		unterlegt.
	</p>
</TextPreview>

<div class="mt-10 flex w-full gap-6">
	<div class="flex w-1/2 flex-1 flex-col justify-start">
		<SizeTabs
			tab={nationTab}
			changeTab={(tab) => (nationTab = tab)}
			largestNationOrNSA={largestNationOrNSA()}
		/>
		<div class="mb-10 flex flex-col gap-2">
			<div class="flex items-center gap-4">
				<h2 class="font-bold">{nationTab} Plätze ({countNationsWithXSeats(nationTab)}x)</h2>
				<button
					class="btn btn-ghost btn-sm w-fit"
					onclick={() => {
						resetSeatCategory(nationTab);
					}}>Kategorie zurücksetzen</button
				>
			</div>
			<div class="flex flex-row flex-wrap gap-2">
				{#each getNations().filter((x) => x.seats === nationTab) as nation}
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
										role="none"
										use:draggable={{
											container: `nations-${nation.nation.alpha3Code}`,
											dragData: { id: application.id }
										}}
										ondrag={() => (dragging = true)}
										ondragend={() => (dragging = false)}
										class="cursor-grab"
									>
										<DelegationCard {application} />
									</div>
								{/each}
							{/if}
						</NationCard>
					</div>
				{/each}
				{#each getNSAs().filter((x) => x.seatAmount === nationTab) as nsa}
					<div
						class="transition-all duration-300"
						use:droppable={{
							container: `nsa-${nsa.id}`,
							callbacks: { onDrop: handleDrop },
							attributes: { draggingClass: 'scale-105' }
						}}
					>
						<NationCard {nsa} emptySeats={getRemainingSeats(nsa)}>
							{#if getAssignedDelegationsForNSA(nsa)}
								{#each getAssignedDelegationsForNSA(nsa) as application}
									<div
										role="none"
										use:draggable={{
											container: `nsa-${nsa.id}`,
											dragData: { id: application.id }
										}}
										ondrag={() => (dragging = true)}
										ondragend={() => (dragging = false)}
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
	</div>
	<div class="bg-base-300 w-1 rounded-full"></div>
	<div
		class="flex flex-1 flex-col justify-start"
		use:droppable={{ container: 'delegationApplications', callbacks: { onDrop: handleDrop } }}
	>
		<SizeTabs
			tab={delegationTab}
			changeTab={(tab) => (delegationTab = tab)}
			largestNationOrNSA={largestApplication()}
		/>
		<div class="mb-10 flex flex-col gap-2">
			<div class="flex items-center gap-4">
				<h2 class="font-bold">
					{delegationTab} Plätze ({countApplicationsWithXMembers(delegationTab)}x)
				</h2>
				<button
					class="btn btn-ghost btn-sm w-fit"
					onclick={() => {
						autoAssign(delegationTab);
					}}>Auto-Zuteilung</button
				>
			</div>
			<div class="flex flex-row flex-wrap gap-2">
				{#each getDelegationApplications().filter((x) => x.members.length === delegationTab && !x.assignedNation && !x.assignedNSA) as application}
					<div
						role="none"
						use:draggable={{
							container: 'delegationApplications',
							dragData: { id: application.id },
							attributes: { draggingClass: 'opacity-50' }
						}}
						ondrag={() => (dragging = true)}
						ondragend={() => (dragging = false)}
						class="cursor-grab"
					>
						<DelegationCard {application} />
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<div
	class="fixed right-20 bottom-0 left-20 flex h-32 justify-center {dragging
		? ''
		: 'translate-y-40'} transition-all duration-300"
>
	<div
		class="bg-warning flex w-full grow-0 flex-col items-center justify-center gap-4 rounded-t-xl p-4 shadow-lg"
		use:droppable={{ container: 'options', callbacks: { onDrop: handleDrop } }}
	>
		<h2 class="w-full text-center font-bold">Zerteilen</h2>
		<div
			class="flex h-full w-full flex-1 items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white"
		>
			<i class="fas fa-split text-4xl text-white"></i>
		</div>
	</div>
</div>

<PartitionModal
	open={!!optionsModalOpen}
	close={() => (optionsModalOpen = undefined)}
	id={optionsModalOpen}
/>
