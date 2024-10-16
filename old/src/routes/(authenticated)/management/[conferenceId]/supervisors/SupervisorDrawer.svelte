<script lang="ts">
	import Drawer from '$lib/components/DataTable/DrawerWrapper.svelte';
	import { apiClient, checkForError } from '$api/client';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import type { ConferenceSupervisorData } from './+page';
	import type { Delegation } from '@prisma/client';
	import Spinner from '$lib/components/Spinner.svelte';

	interface Props {
		supervisor: ConferenceSupervisorData | null;
		onClose: () => void;
		data: PageData;
	}

	let { supervisor, onClose, data }: Props = $props();

	let api = apiClient({ origin: data.url.origin });

	const getDelegations = () =>
		checkForError(
			api.delegation.get({
				query: { supervisorId: supervisor?.id }
			})
		);
</script>

<Drawer open={supervisor != null} {onClose}>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-thin uppercase">{m.supervisor()}</h3>
		<h2 class="rounded-md bg-base-300 p-2 text-3xl font-bold">
			{supervisor?.user?.given_name}
			<span class="uppercase">{supervisor?.user?.family_name}</span>
		</h2>
		<h3 class="text-sm font-thin">{supervisor?.id}</h3>
	</div>

	{#if supervisor?.plansOwnAttendenceAtConference}
		<div class="alert alert-success">
			<i class="fas fa-location-check"></i>
			{m.supervisorPlansOwnAttendance()}
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fas fa-cloud"></i>
			{m.supervisorDoesNotPlanOwnAttendance()}
		</div>
	{/if}
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.delegations()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#await getDelegations()}
						{#each Array.from({ length: 3 }) as _}
							<tr>
								<td colSpan={4}>
									<div class="skeleton h-8"></div>
								</td>
								<td>
									<div class="skeleton h-8"></div>
								</td>
							</tr>
						{/each}
					{:then delegations}
						{#if delegations.length > 0}
							{#each delegations as delegation}
								<tr>
									<td>
										{#if delegation.applied}
											<i class="fa-solid fa-circle-check text-success"></i>
										{:else}
											<i class="fa-solid fa-hourglass-half text-error"></i>
										{/if}
									</td>
									<td class="font-mono">
										{delegation.entryCode}
									</td>
									<td>
										{delegation._count?.members}
									</td>
									<td>
										{delegation.school}
									</td>
									<td>
										<a
											class="btn btn-sm"
											href={`/management/${data.conferenceData.id}/delegations?id=${delegation.id}`}
											aria-label="Details"
										>
											<i class="fa-duotone fa-arrow-up-right-from-square"></i>
										</a>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td>{m.noDelegationsFound()}</td>
							</tr>
						{/if}
					{/await}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<a
			class="btn"
			href={`/management/${data.conferenceData.id}/participants?id=${supervisor?.user.id}`}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
	</div>
</Drawer>
