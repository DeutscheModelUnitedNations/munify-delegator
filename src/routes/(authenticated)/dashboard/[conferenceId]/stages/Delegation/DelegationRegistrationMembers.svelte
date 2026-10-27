<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { page } from '$app/state';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import formatNames from '#lib/helpers/formatNames.js';
	import codenamize from '#lib/helpers/codenamize.js';
	import DelegationStatusTableWrapper from '#lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '#lib/components/delegationStatusTable/Entry.svelte';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import SquareButtonWithLoadingState from '#lib/components/SquareButtonWithLoadingState.svelte';
	import EntryCode from '../Common/EntryCode.svelte';

	/**
	 * A registering delegation: its name, its members, which the head delegate can promote or
	 * remove, and the code that invites more of them until the registration is complete.
	 */
	interface Props {
		conferenceId: string;
		delegationId: string;
		userIsHeadDelegate: boolean;
		/** Anchor for the application's checklist. */
		id?: string;
	}

	let { conferenceId, delegationId, userIsHeadDelegate, id }: Props = $props();

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
		if (!(await confirmDialog({ text: m.makeHeadDelegateConfirmation() }))) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, newHeadDelegateUserId: userId },
			id: true,
			members: { id: true, isHeadDelegate: true }
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const removeMember = async (memberId: string) => {
		if (!(await confirmDialog({ text: m.removeMemberConfirmation(), danger: true }))) return;
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

<DashboardSection {id} icon="users" title={m.delegationMembers()}>
	<div class="bg-base-200 rounded-box mb-4 flex items-center gap-3 px-4 py-3">
		<i class="fa-sharp-duotone fa-solid fa-signature text-base-content/50 text-xl"></i>
		<div class="flex min-w-0 flex-col">
			<span class="text-base-content/60 text-xs">
				{m.delegationName()} · {m.delegationNameExplanation()}
			</span>
			<span class="font-semibold break-words">{codenamize(delegationId)}</span>
		</div>
	</div>
	{#if delegation.members.length > 0}
		<DelegationStatusTableWrapper>
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
			<div class="border-base-200 mt-4 border-t pt-4">
				<p class="font-medium">{m.inviteMorePeople()}</p>
				<p class="text-base-content/60 text-sm">{m.inviteMorePeopleDescription()}</p>
				<EntryCode
					entryCode={delegation.entryCode}
					{referralLink}
					{supervisorLink}
					userHasRotationPermission={userIsHeadDelegate}
					rotationFn={rotateEntryCode}
				/>
			</div>
		{/if}
	{:else}
		<div class="skeleton h-40 w-full"></div>
	{/if}
</DashboardSection>
