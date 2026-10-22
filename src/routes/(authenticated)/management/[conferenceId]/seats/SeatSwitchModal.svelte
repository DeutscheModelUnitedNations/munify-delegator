<script lang="ts">
	import { cache, graphql, type SeatsQuery$result } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import {
		applySeatSwitch,
		isHeadDelegateInvolved,
		seatSwitchError,
		seatSwitchVariables,
		switchTargetDelegationId,
		toSeatSwitch,
		type SwitchMember,
		type SwitchSeat
	} from '$lib/services/seatSwitch';
	import { toast } from 'svelte-sonner';
	import { seatSwitch } from './seatSwitchState.svelte';
	import HeadDelegatePicker from './HeadDelegatePicker.svelte';

	interface Props {
		delegations: SeatsQuery$result['findManyDelegations'];
		conferenceId: string;
	}

	let { delegations, conferenceId }: Props = $props();

	const switchMutation = graphql(`
		mutation SwitchDelegationMemberSeats(
			$conferenceId: ID!
			$memberId: ID!
			$otherMemberId: ID
			$targetNationAlpha3Code: String
			$targetNonStateActorId: ID
			$targetCommitteeId: ID
			$headDelegateMemberIds: [ID!]
		) {
			switchDelegationMemberSeats(
				conferenceId: $conferenceId
				memberId: $memberId
				otherMemberId: $otherMemberId
				targetNationAlpha3Code: $targetNationAlpha3Code
				targetNonStateActorId: $targetNonStateActorId
				targetCommitteeId: $targetCommitteeId
				headDelegateMemberIds: $headDelegateMemberIds
			) {
				id
			}
		}
	`);

	const selected = $derived(seatSwitch.selected);
	const target = $derived(seatSwitch.target);

	const allMembers = $derived(
		delegations.flatMap((d) =>
			d.members.map((x) => ({
				id: x.id,
				delegationId: d.id,
				isHeadDelegate: x.isHeadDelegate,
				name: formatNames(x.user.given_name, x.user.family_name)
			}))
		)
	);

	// head delegates as preselected for the delegations the switch touches
	const after = $derived.by(() => {
		if (!selected || !target) return [];
		const affected = new Set([selected.delegationId, switchTargetDelegationId(target)]);
		return applySeatSwitch(
			allMembers.filter((x) => affected.has(x.delegationId)),
			toSeatSwitch(selected, target)
		);
	});

	const headDelegateInvolved = $derived(
		!!selected && !!target && isHeadDelegateInvolved(allMembers, selected, target)
	);

	const delegationLabels = $derived(
		new Map(
			delegations.map((d) => [
				d.id,
				d.assignedNation
					? getFullTranslatedCountryNameFromISO3Code(d.assignedNation.alpha3Code)
					: d.assignedNonStateActor?.name
			])
		)
	);

	// delegations that still have a choice to make after the switch
	const pickers = $derived(
		[...new Set(after.map((x) => x.delegationId))]
			.map((delegationId) => ({
				delegationId,
				label: delegationLabels.get(delegationId) ?? m.seatSwitchNewDelegation(),
				members: after
					.filter((x) => x.delegationId === delegationId)
					.map((x) => ({ ...x, name: allMembers.find((y) => y.id === x.id)?.name ?? x.id }))
			}))
			.filter((x) => headDelegateInvolved && x.members.length > 1)
	);

	let heads = $derived<Record<string, string>>(
		Object.fromEntries(after.filter((x) => x.isHeadDelegate).map((x) => [x.delegationId, x.id]))
	);

	let loading = $state(false);

	// heads are only sent when there was a choice to make
	const headDelegateMemberIds = $derived(pickers.length > 0 ? Object.values(heads) : null);

	const confirm = async (from: SwitchMember, to: SwitchSeat) => {
		loading = true;
		const result = await switchMutation
			.mutate({ conferenceId, ...seatSwitchVariables(from, to), headDelegateMemberIds })
			.catch(() => undefined);
		loading = false;
		// the server explains why a switch is refused, e.g. a seat that was taken meanwhile
		const error = seatSwitchError(result, m.httpGenericError());
		if (error) return toast.error(error);

		cache.markStale();
		await invalidateAll();
		toast.success(m.seatSwitchSuccess());
		seatSwitch.reset();
	};
</script>

<Modal
	open={!!selected && !!target}
	title={m.seatSwitch()}
	onclose={() => seatSwitch.clearTarget()}
>
	{#if selected && target}
		<div class="flex flex-col gap-4">
			<ul class="flex flex-col gap-2">
				<li class="bg-base-200 rounded-box flex flex-wrap items-center gap-2 p-3">
					<span class="font-bold">{selected.name}</span>
					<span class="text-sm opacity-70">{selected.seatLabel}</span>
					<i class="fa-duotone fa-arrow-right"></i>
					<span class="text-sm">{target.seatLabel}</span>
				</li>
				{#if target.kind === 'member'}
					<li class="bg-base-200 rounded-box flex flex-wrap items-center gap-2 p-3">
						<span class="font-bold">{target.name}</span>
						<span class="text-sm opacity-70">{target.seatLabel}</span>
						<i class="fa-duotone fa-arrow-right"></i>
						<span class="text-sm">{selected.seatLabel}</span>
					</li>
				{/if}
			</ul>

			{#if pickers.length > 0}
				<HeadDelegatePicker {pickers} bind:heads />
			{/if}
		</div>
	{/if}

	{#snippet action()}
		<button class="btn" onclick={() => seatSwitch.clearTarget()} disabled={loading}>
			{m.cancel()}
		</button>
		<button
			class="btn btn-primary"
			onclick={() => selected && target && confirm(selected, target)}
			disabled={loading}
		>
			{#if loading}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<i class="fa-duotone fa-arrow-right-arrow-left"></i>
			{/if}
			{m.confirm()}
		</button>
	{/snippet}
</Modal>
