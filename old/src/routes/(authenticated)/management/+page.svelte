<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	const getAuthorizationRole = (conferenceId: string) => {
		const teamMembership = data.teamMemberships.find((x) => x.conferenceId === conferenceId);
		if (teamMembership) {
			return teamMembership.role;
		}

		if (data.mySystemRoles.includes('admin')) {
			return 'ADMIN';
		}

		return null;
	};

	const getAuthorizationRoleString = (conferenceId: string) => {
		const role = getAuthorizationRole(conferenceId);
		switch (role) {
			case 'ADMIN':
				return m.administrator();
			case 'PROJECT_MANAGEMENT':
				return m.projectManagement();
			case 'PARTICIPANT_CARE':
				return m.participantCare();
		}
	};
</script>

<div class="flex w-full flex-col items-center gap-4 p-10">
	<h1 class="text-2xl font-bold">{m.admininstration()}</h1>
	<p class="text-center max-ch-md">
		{m.administrationConferenceSelection()}
	</p>
	<div class="flex justify-center">
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					<th>{m.authorization()}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.conferences as conference}
					<tr>
						<td>{conference.title}</td>
						<td>{getAuthorizationRoleString(conference.id)}</td>
						<td>
							<a class="btn" href={`management/${conference.id}`}
								>{m.open()}<i class="fa-duotone fa-arrow-right"></i></a
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
