<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import type { SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import DownloadNsaDataBtn from '../downloads/DownloadNsaDataBtn.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		nonStateActors: SeatsQuery$result['findManyNonStateActors'];
		delegations: SeatsQuery$result['findManyDelegations'];
		conferenceId: string;
	}

	let { nonStateActors, delegations, conferenceId }: Props = $props();
</script>

{#snippet downloadNSADataBtn()}
	<DownloadNsaDataBtn {conferenceId} />
{/snippet}

<SeatsTableSection title={m.nsaSeats()} downloadButton={downloadNSADataBtn}>
	<thead>
		<tr>
			<td>
				<i class="fa-duotone fa-megaphone"></i>
			</td>
			<td>
				<i class="fa-duotone fa-users"></i>
			</td>
			<td>
				<i class="fa-duotone fa-sigma"></i>
			</td>
			<td>
				<i class="fa-duotone fa-users-viewfinder"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		{#each nonStateActors as nsa}
			{@const delegation = delegations.find((d) => d.assignedNonStateActor?.id === nsa.id)}
			<tr>
				<td>
					<div class="tooltip tooltip-right flex flex-col items-center" data-tip={nsa.name}>
						<Flag nsa icon={nsa.fontAwesomeIcon ?? ''} size="xs" />
						{nsa.abbreviation.toUpperCase()}
					</div>
				</td>
				<td class="w-full">
					<div class="flex gap-1">
						{#if delegation}
							{#each delegation.members as member}
								<InitialsButton
									given_name={member.user.given_name}
									family_name={member.user.family_name}
									href={`/management/${conferenceId}/participants?filter=${member.user.id}`}
								/>
							{/each}
							{#if delegation.members.length < nsa.seatAmount}
								<AddParticipantBtn />
							{/if}
						{:else}
							<AddParticipantBtn />
						{/if}
					</div>
				</td>
				<td>
					{delegation?.members.length ?? 0}
					{#if nsa.seatAmount !== (delegation?.members.length ?? 0)}
						<span class="text-xs">/ {nsa.seatAmount} </span>
					{/if}
				</td>
				<td>
					{#if delegation}
						<a
							class="btn btn-ghost btn-sm"
							href={`/management/${conferenceId}/delegations?filter=${delegation?.id}`}
							aria-label="View delegation"
						>
							<i class="fa-duotone fa-up-right-from-square"></i>
						</a>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</SeatsTableSection>
