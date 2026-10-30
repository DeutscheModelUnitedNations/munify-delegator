<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import {
		applySeatSwitch,
		isHeadDelegateInvolved,
		seatSwitchVariables,
		toSeatSwitch,
		type SwitchMember,
		type SwitchSeat
	} from '#lib/helpers/seatSwitch';
	import { toast } from 'svelte-sonner';
	import { getSeatSwitch } from './seatSwitchState.svelte';
	import HeadDelegatePicker from './HeadDelegatePicker.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const seatSwitch = getSeatSwitch();
	const selected = $derived(seatSwitch.selected);
	const target = $derived(seatSwitch.target);

	// the delegations the switch touches; a role without one yet has nothing to load
	const selectedDelegationId = $derived(target ? selected?.delegationId : undefined);
	const targetDelegationId = $derived(target?.delegationId);

	function fetchDelegations(ids: string[]) {
		return client.liveQuery.delegations({
			__args: { where: { id: { in: ids } } },
			id: true,
			assignedRole: { kind: true, name: true, nation: { alpha3Code: true } },
			members: { id: true, isHeadDelegate: true, user: { givenName: true, familyName: true } }
		});
	}

	type AffectedDelegation = Awaited<ReturnType<typeof fetchDelegations>>[number];

	const delegations: AffectedDelegation[] = $derived(
		selectedDelegationId
			? await fetchDelegations([selectedDelegationId, targetDelegationId ?? selectedDelegationId])
			: []
	);

	const allMembers = $derived(
		delegations.flatMap((d) =>
			d.members.map((x) => ({
				id: x.id,
				delegationId: d.id,
				isHeadDelegate: x.isHeadDelegate,
				name: formatNames(x.user.givenName, x.user.familyName)
			}))
		)
	);

	const delegationLabels = $derived(
		new Map(
			delegations.map((d) => [
				d.id,
				d.assignedRole?.nation
					? getFullTranslatedCountryNameFromISO3Code(d.assignedRole.nation.alpha3Code)
					: d.assignedRole?.name
			])
		)
	);

	// head delegates as preselected for the delegations the switch touches
	const after = $derived(
		selected && target ? applySeatSwitch(allMembers, toSeatSwitch(selected, target)) : []
	);

	const headDelegateInvolved = $derived(
		!!selected && !!target && isHeadDelegateInvolved(allMembers, selected, target)
	);

	// delegations that still have a choice to make after the switch
	const pickers = $derived(
		headDelegateInvolved
			? [...new Set(after.map((x) => x.delegationId))]
					.map((delegationId) => ({
						delegationId,
						label: delegationLabels.get(delegationId) ?? m.seatSwitchNewDelegation(),
						members: after
							.filter((x) => x.delegationId === delegationId)
							.map((x) => ({
								id: x.id,
								name: allMembers.find((y) => y.id === x.id)?.name ?? x.id
							}))
					}))
					.filter((x) => x.members.length > 1)
			: []
	);

	let heads = $derived<Record<string, string>>(
		Object.fromEntries(after.filter((x) => x.isHeadDelegate).map((x) => [x.delegationId, x.id]))
	);

	let loading = $state(false);

	// heads are only sent when there was a choice to make
	const headDelegateMemberIds = $derived(pickers.length > 0 ? Object.values(heads) : null);

	const confirm = async (from: SwitchMember, to: SwitchSeat) => {
		loading = true;
		const promise = Promise.resolve(
			client.mutate.switchDelegationMemberSeats({
				__args: { conferenceId, ...seatSwitchVariables(from, to), headDelegateMemberIds },
				id: true
			})
		);
		// the server explains why a switch is refused, e.g. a seat that was taken meanwhile
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.seatSwitchSuccess(),
			error: (err) => (err instanceof Error ? err.message : null) || m.genericToastError()
		});
		try {
			await promise;
			seatSwitch.reset();
		} catch {
			// the toast says why; the modal stays open to try again
		} finally {
			loading = false;
		}
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
					<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
					<span class="text-sm">{target.seatLabel}</span>
				</li>
				{#if target.kind === 'member'}
					<li class="bg-base-200 rounded-box flex flex-wrap items-center gap-2 p-3">
						<span class="font-bold">{target.name}</span>
						<span class="text-sm opacity-70">{target.seatLabel}</span>
						<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-arrow-right-arrow-left"></i>
			{/if}
			{m.confirm()}
		</button>
	{/snippet}
</Modal>
