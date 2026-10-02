<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import {
		getSingleApplications,
		getSingleRoles,
		unassignSingleRole,
		convertSingleToDelegation,
		assignSingleRole,
		loadProjects,
		type SingleParticipant
	} from '../appData.svelte';

	import SingleParticipantCard from '../SingleParticipantCard.svelte';
	import DraggableApplication from '../DraggableApplication.svelte';
	import { dropMove, routeSingleDrop } from '../dropRouting';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let dragging = $state(false);

	onMount(() => {
		loadProjects(params.projectId);
	});

	function handleDrop(state: DragDropState<{ id: string }>) {
		const move = dropMove(state);
		if (!move) return;
		routeSingleDrop(move, {
			unassign: unassignSingleRole,
			convert: convertSingleToDelegation,
			assign: assignSingleRole
		});
	}

	let getNumAssignmentsForRole = (role: string) =>
		getSingleApplications().filter((x) => x.assignedRole?.id === role).length;
</script>

<TextPreview>
	<h2>Behandlung der Einzelteilnehmenden</h2>
	<p>
		In diesem Abschnitt können vor der eigentlichen Zuteilung die Einzelteilnehmenden behandelt
		werden. Der Einzelteilnehmenden-Pool enthält alle noch nicht zugeordneten Einzelteilnehmenden.
		Diese können per Drag-and-Drop in die entsprechenden Rollen verschoben werden.
	</p>
	<p>
		Es ist auch möglich, Einzelteilnehmenden zur Delegation zu konvertieren. So können diese in der
		Delegationszuteilung direkt berücksichtigt und automatisch zugeteilt werden. Daher ist es
		sinnvoll, die Zuteilung der Einzelteilnehmenden vor der Delegationszuteilung durchzuführen.
	</p>
</TextPreview>

{#snippet applicationPool(title: string, applications: SingleParticipant[])}
	<div class="bg-base-200 flex flex-col gap-4 rounded-lg p-4 shadow-lg">
		<h2 class="text-xl font-bold">{title}</h2>
		<div class="flex flex-wrap gap-2">
			{#each applications as application (application.id)}
				<DraggableApplication
					container="pool"
					id={application.id}
					onDragChange={(d) => (dragging = d)}
				>
					<SingleParticipantCard {application} />
				</DraggableApplication>
			{/each}
		</div>
	</div>
{/snippet}

<div class="mt-6 flex flex-col gap-4">
	{@render applicationPool(
		'Einzelteilnehmenden-Pool',
		getSingleApplications().filter((x) => !x.assignedRole)
	)}
	{#each getSingleRoles() as role (role.id)}
		{#if !role.name.toLowerCase().startsWith('einzel')}
			{@render applicationPool(
				`${role.name} (${getNumAssignmentsForRole(role.id)})`,
				getSingleApplications().filter((x) => x.assignedRole?.id === role.id)
			)}
		{/if}
	{/each}
</div>

<div
	class="bg-warning fixed top-10 right-10 bottom-10 left-10 z-50 flex flex-col justify-center gap-4 rounded-lg p-4 shadow-lg {dragging
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
			{#each getSingleRoles() as role (role.id)}
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
