<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import type { BoardDelegation } from './board';

	/** Splits a delegation into parts that are assigned on their own, by picking a part per member. */
	interface Props {
		delegation: BoardDelegation;
		onClose: () => void;
	}

	let { delegation, onClose }: Props = $props();

	// Seeded once: the members are fixed while the modal is open.
	const members = untrack(() => delegation.members);
	let partOf = $state<Record<string, number>>(
		Object.fromEntries(members.map((member, index) => [member.id, index === 0 ? 0 : 1]))
	);
	let partCount = $state(2);
	let saving = $state(false);

	const parts = $derived(
		Array.from({ length: partCount }, (_, part) =>
			members.filter((member) => partOf[member.id] === part).map((member) => member.id)
		)
	);
	const valid = $derived(parts.filter((part) => part.length > 0).length >= 2);

	async function split() {
		saving = true;
		try {
			await client.mutate.splitDelegation({
				__args: {
					delegationId: delegation.id,
					parts: parts.filter((part) => part.length > 0).map((memberIds) => ({ memberIds }))
				}
			});
			onClose();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			saving = false;
		}
	}
</script>

<ActionModal
	title={m.assignmentSplitTitle({ name: codenamize(delegation.id) })}
	confirmLabel={m.assignmentSplit()}
	confirmDisabled={!valid}
	loading={saving}
	onConfirm={split}
	{onClose}
>
	<p class="text-base-content/70 text-sm">{m.assignmentSplitDescription()}</p>
	<div class="flex flex-wrap gap-2">
		{#each parts as part, index (index)}
			<span class="badge {part.length > 0 ? 'badge-primary' : 'badge-ghost'}">
				{m.assignmentPart({ number: index + 1 })}: {part.length}
			</span>
		{/each}
	</div>
	<ul class="flex flex-col gap-2">
		{#each members as member (member.id)}
			<li class="flex items-center justify-between gap-4">
				<span>
					{formatNames(member.user.givenName ?? undefined, member.user.familyName ?? undefined)}
					{#if member.isHeadDelegate}
						<i class="fa-duotone fa-crown text-warning" title={m.headDelegate()}></i>
					{/if}
				</span>
				<select
					class="select select-sm w-auto"
					aria-label={m.assignmentPart({ number: (partOf[member.id] ?? 0) + 1 })}
					value={partOf[member.id]}
					onchange={(e) => (partOf[member.id] = Number(e.currentTarget.value))}
				>
					{#each { length: parts.length }, index (index)}
						<option value={index}>{m.assignmentPart({ number: index + 1 })}</option>
					{/each}
				</select>
			</li>
		{/each}
	</ul>
	<div>
		<button
			class="btn btn-sm btn-ghost"
			disabled={partCount >= members.length}
			onclick={() => partCount++}
		>
			<i class="fa-duotone fa-plus"></i>
			{m.assignmentAddPart()}
		</button>
	</div>
</ActionModal>
