<script lang="ts">
	import {
		assignNationToDelegation,
		assignNSAToDelegation,
		getDelegationApplication,
		getDelegationApplications,
		getNations,
		getNSAs,
		getRemainingSeats,
		loadProjects,
		resetSeatCategory,
		unassignNationOrNSAFromDelegation,
		type ProjectNation,
		type NonStateActor,
		type ProjectDelegation
	} from '../appData.svelte';
	import DelegationCard from '../DelegationCard.svelte';
	import DraggableApplication from '../DraggableApplication.svelte';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import NationCard from '../NationCard.svelte';
	import { autoAssign } from '../autoAssign.svelte';
	import SizeTabs from '../SizeTabs.svelte';
	import { dropMove, isRoleContainer, planRoleAssignment, type DropMove } from '../dropRouting';
	import PartitionModal from '../PartitionModal.svelte';
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let dragging = $state(false);
	let optionsModalOpen = $state<string | undefined>(undefined);

	onMount(() => {
		loadProjects(params.projectId);
	});

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

	const roleAssignments = {
		nation: assignNationToDelegation,
		nsa: assignNSAToDelegation,
		full: () => alert('Not enough seats')
	};

	/** Assigns the delegation to the nation or NSA a drop zone stands for, if it has room. */
	function assignToRoleContainer(delegationId: string, container: string) {
		const members = getDelegationApplication(delegationId)?.members.length ?? 0;
		const plan = planRoleAssignment(container, members, {
			nations: getNations(),
			nsas: getNSAs(),
			remainingSeats: getRemainingSeats
		});
		if (plan) roleAssignments[plan.action](delegationId, plan.identifier);
	}

	/**
	 * Moving a delegation off a nation or NSA frees its old seats first, whether it goes to
	 * another one or back to the pool.
	 */
	function moveBetweenRoles(move: DropMove) {
		if (isRoleContainer(move.source)) unassignNationOrNSAFromDelegation(move.itemId);
		if (isRoleContainer(move.target)) assignToRoleContainer(move.itemId, move.target);
	}

	function handleDrop(state: DragDropState<{ id: string }>) {
		const move = dropMove(state);
		if (!move) return;
		if (move.target === 'options') optionsModalOpen = move.itemId;
		else moveBetweenRoles(move);
	}

	const getAssignedDelegationsForNation = (nation: ProjectNation) => {
		return getDelegationApplications().filter(
			(x) => x.assignedNation?.alpha3Code === nation.alpha3Code
		);
	};

	const getAssignedDelegationsForNSA = (nsa: NonStateActor) => {
		return getDelegationApplications().filter((x) => x.assignedNSA?.id === nsa.id);
	};
</script>

{#snippet assignedDelegations(container: string, applications: ProjectDelegation[])}
	{#each applications as application (application.id)}
		<DraggableApplication {container} id={application.id} onDragChange={(d) => (dragging = d)}>
			<DelegationCard {application} />
		</DraggableApplication>
	{/each}
{/snippet}

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
				{#each getNations().filter((x) => x.seats === nationTab) as nation (nation.nation.alpha3Code)}
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
							{@render assignedDelegations(
								`nations-${nation.nation.alpha3Code}`,
								getAssignedDelegationsForNation(nation.nation)
							)}
						</NationCard>
					</div>
				{/each}
				{#each getNSAs().filter((x) => x.seatAmount === nationTab) as nsa (nsa.id)}
					<div
						class="transition-all duration-300"
						use:droppable={{
							container: `nsa-${nsa.id}`,
							callbacks: { onDrop: handleDrop },
							attributes: { draggingClass: 'scale-105' }
						}}
					>
						<NationCard {nsa} emptySeats={getRemainingSeats(nsa)}>
							{@render assignedDelegations(`nsa-${nsa.id}`, getAssignedDelegationsForNSA(nsa))}
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
				{#each getDelegationApplications().filter((x) => x.members.length === delegationTab && !x.assignedNation && !x.assignedNSA) as application (application.id)}
					<DraggableApplication
						container="delegationApplications"
						id={application.id}
						draggingClass="opacity-50"
						onDragChange={(d) => (dragging = d)}
					>
						<DelegationCard {application} />
					</DraggableApplication>
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
