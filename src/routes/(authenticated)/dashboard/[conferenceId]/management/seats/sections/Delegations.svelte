<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import InitialsButton from '../InitialsButton.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// In one derived, so none of the three waits on another.
	const [committees, nations, delegations] = $derived(
		await Promise.all([
			client.liveQuery.committees({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true
			}),
			client.liveQuery.nations({
				__args: { where: { committees: { conferenceId: { eq: conferenceId } } } },
				alpha2Code: true,
				alpha3Code: true,
				committees: { id: true, numOfSeatsPerDelegation: true }
			}),
			client.liveQuery.delegations({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						assignedNationAlpha3Code: { isNotNull: true }
					}
				},
				id: true,
				assignedNation: { alpha3Code: true },
				members: {
					id: true,
					assignedCommittee: { id: true },
					user: { id: true, givenName: true, familyName: true }
				}
			})
		])
	);

	const sortedNations = $derived(
		[...nations].sort((a, b) =>
			getFullTranslatedCountryNameFromISO3Code(a.alpha3Code).localeCompare(
				getFullTranslatedCountryNameFromISO3Code(b.alpha3Code)
			)
		)
	);

	let user = $state<Partial<UserPreview> | undefined>(undefined);

	const addParticipant = async (alpha3Code: string, committeeId: string) => {
		if (!user?.id) return;
		await client.mutate.createAppliedDelegationMember({
			__args: {
				userId: user.id,
				conferenceId,
				assignedNationAlpha3Code: alpha3Code,
				assignedCommitteeId: committeeId
			},
			id: true
		});
	};

	type Nation = (typeof sortedNations)[number];
	type Committee = (typeof committees)[number];
	type Delegation = (typeof delegations)[number];

	/** Per committee: how many of its seats are taken, and how many the nations have in it. */
	const committeeSeats = $derived(
		new Map(
			committees.map((committee) => [
				committee.id,
				{
					occupied: delegations.reduce(
						(acc, delegation) =>
							acc +
							delegation.members.filter((dm) => dm.assignedCommittee?.id === committee.id).length,
						0
					),
					total: nations.reduce(
						(acc, nation) =>
							acc +
							(nation.committees.find((c) => c.id === committee.id)?.numOfSeatsPerDelegation ?? 0),
						0
					)
				}
			])
		)
	);

	/** The seats a nation has across this conference's committees. */
	function nationSeatTotal(nation: Nation) {
		const committeeIds = committees.map((c) => c.id);
		return nation.committees.reduce(
			(acc, committee) =>
				committeeIds.includes(committee.id) ? acc + committee.numOfSeatsPerDelegation : acc,
			0
		);
	}

	/** `count` keys for an `{#each}` that renders one thing per seat. */
	const seatKeys = (count: number) => Array.from({ length: count }, (_, seat) => seat);
</script>

{#snippet addParticipantBtn(nation: Nation, committee: Committee, warning: boolean = false)}
	<AddParticipantBtn
		bind:user
		targetRole={`${getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)} / ${committee.abbreviation}`}
		addParticipant={async () => await addParticipant(nation.alpha3Code, committee.id)}
		{warning}
	/>
{/snippet}

<!-- The seats a nation's delegation has in one committee: who sits there, and free seats to fill. -->
{#snippet seatCell(
	nation: Nation,
	committee: Committee,
	delegation: Delegation | undefined,
	sumSeats: number
)}
	{@const seatsPerCommittee = committee.numOfSeatsPerDelegation}
	{@const assignedDelegationMember = (delegation?.members ?? []).filter(
		(dm) => dm.assignedCommittee?.id === committee.id
	)}
	{#if !delegation}
		{#each seatKeys(seatsPerCommittee) as seat (seat)}
			{@render addParticipantBtn(nation, committee)}
		{/each}
	{:else if assignedDelegationMember.length > 0}
		<div class="flex justify-center gap-1">
			{#each assignedDelegationMember as member (member.id)}
				<InitialsButton
					given_name={member.user.givenName}
					family_name={member.user.familyName}
					userId={member.user.id}
				/>
			{/each}

			{#each seatKeys(seatsPerCommittee - assignedDelegationMember.length) as seat (seat)}
				{@render addParticipantBtn(nation, committee)}
			{/each}
		</div>
	{:else if delegation.members.length < sumSeats}
		{#each seatKeys(seatsPerCommittee) as seat (seat)}
			{@render addParticipantBtn(
				nation,
				committee,
				delegation.members.some((x) => !x.assignedCommittee)
			)}
		{/each}
	{:else}
		<div class="tooltip" data-tip={m.committeeAssignment()}>
			<div
				class="border-info flex h-8 w-10 items-center justify-center rounded-selector border border-dotted"
			>
				<i class="fas fa-hourglass-half text-info"></i>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet nationRow(nation: Nation)}
	{@const delegation = delegations.find((d) => d.assignedNation?.alpha3Code === nation.alpha3Code)}
	{@const sumSeats = nationSeatTotal(nation)}
	<tr>
		<th class="z-10! bg-inherit text-left font-normal">
			<div class="flex flex-col items-start gap-1.5">
				<div class="flex items-center gap-2">
					<Flag alpha2Code={nation.alpha2Code} size="xs" />
					{nation.alpha3Code.toUpperCase()}
				</div>
				<span class="text-left text-xs text-gray-400">
					{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
				</span>
			</div>
		</th>
		{#each committees as committee (committee.id)}
			{#if nation.committees.find((c) => c.id === committee.id)}
				<td>{@render seatCell(nation, committee, delegation, sumSeats)}</td>
			{:else}
				<td>
					<div class="flex justify-center gap-2 opacity-20">
						{#each seatKeys(committee.numOfSeatsPerDelegation) as seat (seat)}
							<i class="fas fa-circle-small text-[8px]"></i>
						{/each}
					</div>
				</td>
			{/if}
		{/each}
		<td>
			{delegation?.members.length ?? 0}
			{#if sumSeats !== (delegation?.members.length ?? 0)}
				<span class="text-xs">/ {sumSeats} </span>
			{/if}
		</td>
	</tr>
{/snippet}

<SeatsTableSection>
	<thead>
		<tr class="z-30!">
			<th class="bg-base-100 z-20!"></th>
			{#each committees as committee (committee.id)}
				{@const seats = committeeSeats.get(committee.id)}
				<th class="bg-base-100 z-20!">
					<div class="flex flex-col items-center">
						<span class="text-lg font-bold">{committee.abbreviation}</span>
						<span class="text-sm font-normal">
							<span class={seats?.occupied === seats?.total ? 'font-normal' : 'font-bold'}>
								{seats?.occupied ?? 0}
							</span>
							<span class="text-xs opacity-70">/ {seats?.total ?? 0}</span>
						</span>
					</div>
				</th>
			{/each}
			<th class="bg-base-100 z-20!"><i class="fa-duotone fa-sigma"></i></th>
		</tr>
	</thead>
	<tbody>
		{#each sortedNations as nation (nation.alpha3Code)}
			{@render nationRow(nation)}
		{/each}
	</tbody>
</SeatsTableSection>
