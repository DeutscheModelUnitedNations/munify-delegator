<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import SeatsIconHeader from '../SeatsIconHeader.svelte';
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import InitialsButton from '../InitialsButton.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DownloadSingleParticipantsDataBtn from '../downloads/DownloadSingleParticipantsDataBtn.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const roles = $derived(
		await client.liveQuery.customConferenceRoles({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			name: true,
			fontAwesomeIcon: true,
			seatAmount: true
		})
	);

	const singleParticipants = $derived(
		await client.liveQuery.singleParticipants({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			user: { id: true, givenName: true, familyName: true },
			assignedRole: { id: true }
		})
	);

	let user = $state<Partial<UserPreview> | undefined>(undefined);

	const addParticipant = async (roleId: string) => {
		if (!user?.id) return;
		await client.mutate.createAppliedSingleParticipant({
			__args: {
				userId: user.id,
				conferenceId,
				roleId
			},
			id: true
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
	<SeatsIconHeader icon="fa-masks-theater" />
	<tbody>
		{#each roles as role (role.id)}
			{@const participants = singleParticipants.filter((sp) => sp.assignedRole?.id === role.id)}
			<tr>
				<td class="flex items-center gap-2">
					<Flag nsa icon={role.fontAwesomeIcon ?? ''} size="xs" />
					{role.name}
				</td>
				<td>
					<div class="flex flex-wrap gap-1">
						{#each participants as participant (participant.id)}
							<InitialsButton
								given_name={participant.user.givenName}
								family_name={participant.user.familyName}
								userId={participant.user.id}
								{conferenceId}
							/>
						{/each}
						<AddParticipantBtn
							bind:user
							targetRole={`${role.name} (${m.singleParticipant()})`}
							addParticipant={async () => await addParticipant(role.id)}
						/>
					</div>
				</td>
				<td>
					{participants.length ?? 0}
					<span class="text-xs">/ {role.seatAmount} </span>
				</td>
			</tr>
		{/each}
	</tbody>
</SeatsTableSection>
