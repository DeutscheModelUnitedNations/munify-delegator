<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		supervisors: {
			id: string;
			plansOwnAttendenceAtConference: boolean;
			user: { givenName: string | null; familyName: string | null };
		}[];
	}

	let { conferenceId, supervisors }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xl font-bold">{m.supervisors()}</h3>

	{#if supervisors.length === 0}
		<div class="alert alert-info">
			<i class="fa-solid fa-user-slash"></i>
			{m.noSupervisors()}
		</div>
	{:else}
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each supervisors as supervisor (supervisor.id)}
					<tr>
						<td>
							{#if supervisor.plansOwnAttendenceAtConference}
								<i class="fa-duotone fa-location-check text-lg"></i>
							{:else}
								<i class="fa-duotone fa-cloud text-lg"></i>
							{/if}
						</td>
						<td>
							<span class="capitalize">{supervisor.user.givenName}</span>
							<span class="uppercase">{supervisor.user.familyName}</span>
						</td>
						<td>
							<a
								class="btn btn-sm"
								href={resolve(
									`/(authenticated)/management/[conferenceId]/supervisors?selected=${supervisor.id}`,
									{
										conferenceId
									}
								)}
								aria-label="Details"
							>
								<i class="fa-duotone fa-arrow-up-right-from-square"></i>
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
