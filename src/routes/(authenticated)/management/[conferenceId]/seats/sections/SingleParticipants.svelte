<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import type { SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DownloadSingleParticipantsDataBtn from '../downloads/DownloadSingleParticipantsDataBtn.svelte';

	interface Props {
		singleParticipants: SeatsQuery$result['findManySingleParticipants'];
		roles: SeatsQuery$result['findManyCustomConferenceRoles'];
		conferenceId: string;
	}

	let { singleParticipants, roles, conferenceId }: Props = $props();
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
			<td>
				<i class="fa-duotone fa-masks-theater"></i>
			</td>
			<td>
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
					<td class="flex items-center gap-4">
						<Flag nsa icon={role.fontAwesomeIcon ?? ''} size="xs" />
						{role.name}
					</td>
					<td class="w-full">
						{#if participants.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each participants as participant}
									<InitialsButton
										given_name={participant.user.given_name}
										family_name={participant.user.family_name}
										href={`/management/${conferenceId}/participants?filter=${participant.user.id}`}
									/>
								{/each}
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
