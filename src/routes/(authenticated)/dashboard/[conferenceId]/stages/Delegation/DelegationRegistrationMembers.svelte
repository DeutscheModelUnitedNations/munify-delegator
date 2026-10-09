<script lang="ts">
	import { page } from '$app/state';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import formatNames from '$lib/helpers/formatNames';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import EntryCode from '../Common/EntryCode.svelte';

	/**
	 * A registering delegation's members, which the head delegate can promote or remove, and the
	 * code that invites more of them until the registration is complete.
	 */
	interface Props {
		conferenceId: string;
		delegationId: string;
		delegationMemberId: string;
		userIsHeadDelegate: boolean;
	}

	let { conferenceId, delegationId, delegationMemberId, userIsHeadDelegate }: Props = $props();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			id: true,
			entryCode: true,
			applied: true,
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true, pronouns: true }
			}
		})
	);

	/** Members can be rearranged by the head delegate until the registration is complete. */
	const canManageMembers = $derived(
		userIsHeadDelegate && delegation.members.length > 1 && !delegation.applied
	);

	let referralLink = $derived(
		`${page.url.origin}/registration/${conferenceId}/join-delegation?code=${delegation.entryCode}`
	);

	let supervisorLink = $derived(`${page.url.origin}/registration/${conferenceId}/supervisor`);

	const makeHeadDelegate = async (userId: string) => {
		if (!confirm(m.makeHeadDelegateConfirmation())) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, newHeadDelegateUserId: userId },
			id: true,
			members: { id: true, isHeadDelegate: true }
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const removeMember = async (memberId: string) => {
		if (!confirm(m.removeMemberConfirmation())) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegationMember({ __args: { id: memberId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const rotateEntryCode = async () => {
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, resetEntryCode: true },
			id: true,
			entryCode: true
		});
		toast.promise(promise, { ...genericPromiseToastMessages, success: m.codeRotated() });
		await promise;
	};
</script>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	{#if delegation.members.length > 0}
		<DelegationStatusTableWrapper title={m.activeMembers()}>
			{#each delegation.members as member (member.id)}
				<DelegationStatusTableEntry
					name={formatNames(
						member.user.givenName ?? undefined,
						member.user.familyName ?? undefined
					)}
					pronouns={member.user.pronouns ?? ''}
					headDelegate={member.isHeadDelegate}
				>
					{#if canManageMembers}
						<div class="tooltip tooltip-left" data-tip={m.makeHeadDelegate()}>
							<SquareButtonWithLoadingState
								cssClass="btn-warning"
								icon="medal"
								duotone={false}
								disabled={member.isHeadDelegate}
								onClick={async () => makeHeadDelegate(member.user.id)}
							/>
						</div>
						<div class="tooltip tooltip-left" data-tip={m.removeMember()}>
							<SquareButtonWithLoadingState
								cssClass="btn-error"
								icon="trash"
								duotone={false}
								disabled={member.isHeadDelegate}
								onClick={async () => removeMember(member.id)}
							/>
						</div>
					{/if}
				</DelegationStatusTableEntry>
			{/each}
		</DelegationStatusTableWrapper>
		{#if !delegation.applied}
			<DashboardContentCard
				title={m.inviteMorePeople()}
				description={m.inviteMorePeopleDescription()}
			>
				<EntryCode
					entryCode={delegation.entryCode}
					{referralLink}
					{supervisorLink}
					userHasRotationPermission={userIsHeadDelegate}
					rotationFn={rotateEntryCode}
				/>
			</DashboardContentCard>
		{/if}
		<SupervisorTable {delegationMemberId} {conferenceId} />
	{:else}
		<div class="skeleton h-60 w-full"></div>
	{/if}
</section>
