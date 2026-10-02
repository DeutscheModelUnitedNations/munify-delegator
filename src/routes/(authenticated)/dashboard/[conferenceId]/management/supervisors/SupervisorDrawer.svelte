<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import formatNames from '$lib/helpers/formatNames';
	import StatusWidgetBoolean from '$lib/components/BooleanStatusWidget.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import UserCardButton from '$lib/components/registrationAdmin/UserCardButton.svelte';
	import SupervisedTable from './SupervisedTable.svelte';

	interface Props {
		conferenceId: string;
		supervisorId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { supervisorId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			id: true,
			plansOwnAttendenceAtConference: true,
			user: person,
			supervisedDelegationMembers: {
				id: true,
				user: person,
				isHeadDelegate: true,
				delegation: {
					id: true,
					entryCode: true,
					applied: true,
					members: { id: true },
					school: true
				}
			},
			supervisedSingleParticipants: {
				id: true,
				school: true,
				applied: true,
				user: { givenName: true, familyName: true }
			}
		})
	);

	/** Each supervised delegation once, with the supervised members that belong to it. */
	const delegations = $derived.by(() => {
		const members = supervisor.supervisedDelegationMembers;
		const unique = members
			.map((member) => member.delegation)
			.filter((d, i, all) => all.findIndex((other) => other.id === d.id) === i);
		return unique.map((delegation) => ({
			delegation,
			members: members.filter((member) => member.delegation.id === delegation.id)
		}));
	});

	const changeAdministrativeStatus = async (plansOwnAttendence: boolean) => {
		await client.mutate.updateConferenceSupervisor({
			__args: { id: supervisor.id, plansOwnAttendenceAtConference: plansOwnAttendence },
			id: true,
			plansOwnAttendenceAtConference: true
		});
	};
</script>

{#snippet appliedIcon(applied: boolean)}
	{#if applied}
		<i class="fa-solid fa-circle-check text-success"></i>
	{:else}
		<i class="fa-solid fa-hourglass-half text-error"></i>
	{/if}
{/snippet}

{#snippet detailsLink(list: 'delegations' | 'individuals', selectedId: string)}
	<a
		class="btn btn-sm"
		href={resolve(`/dashboard/${conferenceId}/management/${list}?selected=${selectedId}`)}
		aria-label="Details"
	>
		<i class="fa-duotone fa-arrow-up-right-from-square"></i>
	</a>
{/snippet}

<Drawer
	bind:open
	{onClose}
	category={m.supervisor()}
	title={formatNames(
		supervisor.user.givenName ?? undefined,
		supervisor.user.familyName ?? undefined,
		{ givenNameFirst: false }
	)}
	id={supervisor.id}
	loading={false}
>
	{#if supervisor.plansOwnAttendenceAtConference}
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
	<StatusWidgetBoolean
		title={m.attendance()}
		faIcon="fa-calendar-check"
		falseicon="fa-cloud"
		trueicon="fa-location-check"
		falsecolor="btn-info"
		status={supervisor.plansOwnAttendenceAtConference}
		changeStatus={async (newStatus: boolean) => changeAdministrativeStatus(newStatus)}
	/>
	<SupervisedTable
		title={m.delegations()}
		columnCount={5}
		empty={delegations.length === 0}
		emptyMessage={m.noDelegationsFound()}
	>
		{#each delegations as { delegation, members } (delegation.id)}
			<tr>
				<td>{@render appliedIcon(delegation.applied)}</td>
				<td class="font-mono">
					{delegation.entryCode}
				</td>
				<td>
					{delegation.members.length}
				</td>
				<td>
					{delegation.school}
				</td>
				<td>
					{@render detailsLink('delegations', delegation.id)}
				</td>
			</tr>
			{#each members as member (member.id)}
				<tr class="text-xs">
					<td class="text-right"><i class="fa-duotone fa-arrow-turn-down-right"></i></td>
					<td colspan="3">
						{member.user.givenName}
						<span class="uppercase">{member.user.familyName}</span>
						{#if member.isHeadDelegate}
							<i class="fa-duotone fa-medal ml-2"></i>
						{/if}
					</td>
					<td>
						<UserCardButton userId={member.user.id} {conferenceId} />
					</td>
				</tr>
			{/each}
			<tr><td></td></tr>
		{/each}
	</SupervisedTable>

	<SupervisedTable
		title={m.singleParticipants()}
		columnCount={4}
		empty={supervisor.supervisedSingleParticipants.length === 0}
		emptyMessage={m.noSingleParticipantsFound()}
	>
		{#each supervisor.supervisedSingleParticipants as singleParticipant (singleParticipant.id)}
			<tr>
				<td>{@render appliedIcon(singleParticipant.applied)}</td>
				<td class="">
					{singleParticipant.user.givenName}
					<span class="uppercase">{singleParticipant.user.familyName}</span>
				</td>
				<td>
					{singleParticipant.school}
				</td>
				<td>
					{@render detailsLink('individuals', singleParticipant.id)}
				</td>
			</tr>
		{/each}
	</SupervisedTable>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button class="btn" onclick={() => openUserCard(supervisor.user.id, conferenceId)}>
			{m.adminUserCard()}
			<i class="fa-duotone fa-id-card"></i>
		</button>
	</div>
</Drawer>
