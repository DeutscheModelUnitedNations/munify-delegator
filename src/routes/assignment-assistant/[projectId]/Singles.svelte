<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import {
		getSingleApplications,
		getSingleRoles,
		unassignSingleRole,
		convertSingleToDelegation,
		assignSingleRole
	} from './appData.svelte';

	import SingleParticipantCard from './SingleParticipantCard.svelte';

	let dragging = $state(false);

	function handleDrop(state: DragDropState<{ id: string }>) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		if (!targetContainer || sourceContainer === targetContainer || !draggedItem.id) return;

		if (targetContainer === 'backToPool') {
			unassignSingleRole(draggedItem.id);
		} else if (targetContainer === 'convertToDelegation') {
			convertSingleToDelegation(draggedItem.id);
		} else if (targetContainer.startsWith('role')) {
			assignSingleRole(draggedItem.id, targetContainer.split('-')[1]);
		}
	}
</script>

<TextPreview>
	<h2>Behandlung der Einzelteilnehmenden</h2>
	<p>
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
		labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
		laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
		voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
		non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
	</p>
</TextPreview>

<div class="mt-6 flex flex-col gap-4">
	<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4 shadow-lg">
		<h2 class="text-xl font-bold">Einzelteilnehmenden-Pool</h2>
		<div class="flex flex-wrap gap-2">
			{#each getSingleApplications().filter((x) => !x.assignedRole) as application}
				<div
					role="none"
					use:draggable={{ container: 'pool', dragData: { id: application.id } }}
					ondrag={() => (dragging = true)}
					ondragend={() => (dragging = false)}
					class="cursor-grab"
				>
					<SingleParticipantCard {application} />
				</div>
			{/each}
		</div>
	</div>
	{#each getSingleRoles() as role}
		{#if !role.name.toLowerCase().startsWith('einzel')}
			<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4 shadow-lg">
				<h2 class="text-xl font-bold">{role.name}</h2>
				<div class="flex flex-wrap gap-2">
					{#each getSingleApplications().filter((x) => x.assignedRole?.id === role.id) as application}
						<div
							role="none"
							use:draggable={{ container: 'pool', dragData: { id: application.id } }}
							ondrag={() => (dragging = true)}
							ondragend={() => (dragging = false)}
							class="cursor-grab"
						>
							<SingleParticipantCard {application} />
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>

<div
	class="fixed bottom-10 left-10 right-10 top-10 z-50 flex flex-col justify-center gap-4 rounded-lg bg-warning p-4 shadow-lg {dragging
		? ''
		: 'translate-y-[100vh]'} transition-all duration-300"
>
	<h2 class="w-full text-center font-bold">Ablegen</h2>
	<div class="flex h-full w-full flex-col items-center justify-center gap-4">
		<div
			class="flex h-full w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white"
			use:droppable={{ container: 'backToPool', callbacks: { onDrop: handleDrop } }}
		>
			<h3 class="text-2xl text-white">Zurück in den Pool</h3>
			<i class="fas fa-box-archive text-4xl text-white"></i>
		</div>
		<div class="flex w-full flex-1 gap-4">
			{#each getSingleRoles() as role}
				{#if !role.name.toLowerCase().startsWith('einzel')}
					<div
						class="flex h-full w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white"
						use:droppable={{ container: `role-${role.id}`, callbacks: { onDrop: handleDrop } }}
					>
						<h3 class="text-2xl text-white">{role.name}</h3>
						<i class="fas fa-{role.fontAwesomeIcon?.replace('fa-', '')} text-4xl text-white"></i>
					</div>
				{/if}
			{/each}
		</div>
		<div
			class="flex h-full w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white"
			use:droppable={{ container: 'convertToDelegation', callbacks: { onDrop: handleDrop } }}
		>
			<h3 class="text-2xl text-white">Zu Delegation</h3>
			<div class="flex items-center justify-center">
				<i class="fas fa-arrow-right text-4xl text-white"></i>
				<i class="fas fa-users-viewfinder text-4xl text-white"></i>
			</div>
		</div>
	</div>
</div>
