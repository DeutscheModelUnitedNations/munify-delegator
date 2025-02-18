<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { graphql, type getUserInfo$result, type SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DownloadSingleParticipantsDataBtn from '../downloads/DownloadSingleParticipantsDataBtn.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		singleParticipants: SeatsQuery$result['findManySingleParticipants'];
		roles: SeatsQuery$result['findManyCustomConferenceRoles'];
		conferenceId: string;
	}

	let { singleParticipants, roles, conferenceId }: Props = $props();

	const addSingleParticipantMutation = graphql(`
		mutation addSingleParticipant($userId: ID!, $conferenceId: ID!, $roleId: ID!) {
			createOneAppliedSingleParticipant(
				userId: $userId
				conferenceId: $conferenceId
				roleId: $roleId
			) {
				id
			}
		}
	`);

	let user = $state<Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined>(undefined);

	const addParticipant = async (roleId: string) => {
		if (!user?.id) return;
		await addSingleParticipantMutation.mutate({
			userId: user.id,
			conferenceId: conferenceId,
			roleId
		});
	};
</script>

{#snippet downloadSingleParticipantsDataBtn()}
	<DownloadSingleParticipantsDataBtn {conferenceId} />
{/snippet}

<SeatsTableSection
	title={m.singleParticipants()}
	downloadButton={downloadSingleParticipantsDataBtn}
>
	<thead>
		<tr>
			<td class="text-left">
				<i class="fa-duotone fa-masks-theater"></i>
			</td>
			<td class="text-left">
				<i class="fa-duotone fa-users"></i>
			</td>
			<td>
				<i class="fa-duotone fa-sigma"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		{#each roles as role}
			{@const participants = singleParticipants.filter((sp) => sp.assignedRole?.id === role.id)}
			{#if participants.length !== 0}
				<tr>
					<td class="flex items-center gap-2">
						<Flag nsa icon={role.fontAwesomeIcon ?? ''} size="xs" />
						{role.name}
					</td>
					<td>
						{#if participants.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each participants as participant}
									<InitialsButton
										given_name={participant.user.given_name}
										family_name={participant.user.family_name}
										href={`/management/${conferenceId}/participants?filter=${participant.user.id}`}
									/>
								{/each}
								<AddParticipantBtn
									bind:user
									targetRole={`${role.name} (${m.singleParticipant()})`}
									addParticipant={async () => await addParticipant(role.id)}
								/>
							</div>
						{:else}
							<i class="fas fa-dash text-gray-400"></i>
						{/if}
					</td>
					<td>
						{participants.length ?? 0}
					</td>
				</tr>
			{/if}
		{/each}
	</tbody>
</SeatsTableSection>
