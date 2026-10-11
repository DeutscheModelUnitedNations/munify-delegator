<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import InitialsButton from '../InitialsButton.svelte';
	import DownloadSupervisorDataBtn from '../downloads/DownloadSupervisorDataBtn.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const supervisorList = $derived(
		await client.liveQuery.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: { id: true, givenName: true, familyName: true }
		})
	);

	// The order argument cannot reach through to the user's name, so this sorts here.
	const supervisors = $derived(
		[...supervisorList].sort((a, b) =>
			(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
		)
	);

	let user = $state<Partial<UserPreview> | undefined>(undefined);
	let plansOwnAttendenceAtConference = $state(false);

	const addParticipant = async () => {
		if (!user?.id) return;
		await client.mutate.createConferenceSupervisor({
			__args: { userId: user.id, conferenceId, plansOwnAttendenceAtConference },
			id: true
		});
	};
</script>

<SeatsTableSection title={m.supervisors()}>
	{#snippet downloadButton()}
		<DownloadSupervisorDataBtn {conferenceId} />
	{/snippet}

	<thead>
		<tr>
			<td>
				<i class="fa-sharp-duotone fa-solid fa-users"></i>
			</td>
			<td>
				<i class="fa-sharp-duotone fa-solid fa-sigma"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>
				{#if supervisors.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each supervisors as supervisor (supervisor.id)}
							<InitialsButton
								given_name={supervisor.user.givenName}
								family_name={supervisor.user.familyName}
								userId={supervisor.user.id}
							/>
						{/each}

						{#snippet plansOwnAttendenceCheck()}
							<fieldset class="fieldset">
								<label class="label cursor-pointer">
									<span class="mr-4">{m.supervisorPlansOwnAttendance()}</span>
									<input
										type="checkbox"
										bind:checked={plansOwnAttendenceAtConference}
										class="checkbox"
									/>
								</label>
							</fieldset>
						{/snippet}

						<AddParticipantBtn
							bind:user
							targetRole={m.supervisor()}
							{addParticipant}
							formElements={[plansOwnAttendenceCheck]}
						/>
					</div>
				{:else}
					<i class="fas fa-dash text-gray-400"></i>
				{/if}
			</td>
			<td>
				{supervisors.length ?? 0}
			</td>
		</tr>
	</tbody>
</SeatsTableSection>
