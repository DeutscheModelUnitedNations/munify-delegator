<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { graphql, type getUserInfo$result, type SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import DownloadCommitteeDataBtn from '../downloads/DownloadCommitteeDataBtn.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		delegations: SeatsQuery$result['findManyDelegations'];
		committees: SeatsQuery$result['findManyCommittees'];
		nations: SeatsQuery$result['findManyNations'];
		conferenceId: string;
	}

	let { delegations, committees, nations, conferenceId }: Props = $props();

	const addNationParticipantMutation = graphql(`
		mutation addNationParticipant(
			$userId: ID!
			$conferenceId: ID!
			$assignedNationAlpha3Code: String!
			$assignedCommitteeId: ID
		) {
			createOneAppliedDelegationMember(
				userId: $userId
				conferenceId: $conferenceId
				assignedNationAlpha3Code: $assignedNationAlpha3Code
				assignedCommitteeId: $assignedCommitteeId
			) {
				id
			}
		}
	`);

	let user = $state<Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined>(undefined);

	const addParticipant = async (alpha3Code: string, committeeId: string) => {
		if (!user?.id) return;
		await addNationParticipantMutation.mutate({
			userId: user.id,
			conferenceId: conferenceId,
			assignedNationAlpha3Code: alpha3Code,
			assignedCommitteeId: committeeId
		});
	};
</script>

<SeatsTableSection title={m.seats()}>
	<thead>
		<tr>
			<td> </td>
			{#each committees as committee}
				<th>
					<DownloadCommitteeDataBtn {committee} />
				</th>
			{/each}
		</tr>
		<tr>
			<td><i class="fa-duotone fa-sigma"></i></td>
			{#each committees as committee}
				{@const occupiedSeats = delegations.reduce((acc, delegation) => {
					return (
						acc +
						delegation.members.filter((dm) => dm.assignedCommittee?.id === committee.id).length
					);
				}, 0)}
				{@const sumSeats = nations.reduce((acc, nation) => {
					if (nation.committees.find((c) => c.id === committee.id)) {
						return (
							acc +
							(nation.committees.find((c) => c.id === committee.id)?.numOfSeatsPerDelegation ?? 0)
						);
					}
					return acc;
				}, 0)}
				<td>
					{occupiedSeats}
					<span class="text-xs font-normal">/ {sumSeats} </span>
				</td>
			{/each}
		</tr>
		<tr>
			<th>
				<i class="fa-duotone fa-flag"></i>
			</th>
			{#each committees as committee}
				<th>
					<div class="tooltip" data-tip={committee.name}>
						{committee.abbreviation}
					</div>
				</th>
			{/each}
			<th><i class="fa-duotone fa-sigma"></i></th>
			<th><i class="fa-duotone fa-users-viewfinder"></i></th>
		</tr>
	</thead>
	<tbody>
		{#each nations.sort( (a, b) => getFullTranslatedCountryNameFromISO3Code(a.alpha3Code).localeCompare(getFullTranslatedCountryNameFromISO3Code(b.alpha3Code)) ) ?? [] as nation}
			{@const delegation = delegations.find(
				(d) => d.assignedNation?.alpha3Code === nation.alpha3Code
			)}
			{@const sumSeats = nation.committees.reduce((acc, committee) => {
				if (committees.flatMap((c) => c.id).includes(committee.id)) {
					return acc + committee.numOfSeatsPerDelegation;
				}
				return acc;
			}, 0)}
			<tr>
				<td>
					<div
						class="tooltip tooltip-right"
						data-tip={getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
					>
						<Flag alpha2Code={nation.alpha2Code} size="xs" />
						{nation.alpha3Code.toUpperCase()}
					</div>
				</td>
				{#each committees as committee}
					{#if nation.committees.find((c) => c.id === committee.id)}
						{#snippet addParticipantBtn(warning: boolean = false)}
							<AddParticipantBtn
								bind:user
								targetRole={`${getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)} / ${committee.abbreviation}`}
								addParticipant={async () => await addParticipant(nation.alpha3Code, committee.id)}
								{warning}
							/>
						{/snippet}

						<td>
							{#if delegation}
								{@const assignedDelegationMember = delegation.members.filter(
									(dm) => dm.assignedCommittee?.id === committee.id
								)}

								{#if assignedDelegationMember && assignedDelegationMember.length > 0}
									<div class="flex justify-center gap-1">
										{#each assignedDelegationMember as member}
											<InitialsButton
												given_name={member.user.given_name}
												family_name={member.user.family_name}
												href={`/management/${conferenceId}/participants?filter=${member.user.id}`}
											/>
										{/each}
										{#if assignedDelegationMember.length < committee.numOfSeatsPerDelegation}
											{@render addParticipantBtn()}
										{/if}
									</div>
								{:else if delegation.members.length < sumSeats}
									{@render addParticipantBtn(delegation.members.some((x) => !x.assignedCommittee))}
								{:else}
									<div class="tooltip" data-tip={m.committeeAssignment()}>
										<div
											class="flex h-8 w-10 items-center justify-center rounded-md border border-dotted border-info"
										>
											<i class="fas fa-hourglass-half text-info"></i>
										</div>
									</div>
								{/if}
							{:else}
								{@render addParticipantBtn()}
							{/if}
						</td>
					{:else}
						<td><i class="fas fa-circle-small text-[8px] text-gray-300"></i></td>
					{/if}
				{/each}
				<td>
					{delegation?.members.length ?? 0}
					{#if sumSeats !== (delegation?.members.length ?? 0)}
						<span class="text-xs">/ {sumSeats} </span>
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
