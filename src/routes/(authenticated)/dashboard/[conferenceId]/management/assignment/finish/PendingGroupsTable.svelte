<script lang="ts">
	import { wishStatus } from '$lib/assignment/board';
	import { targetKey, type AssignmentGroup, type Target } from '$lib/assignment/state';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';
	import type { BoardDelegation } from '../board';

	/** The groups applying the draft gives a different role, before and after. */
	interface Props {
		groups: AssignmentGroup[];
		merged: Set<string>;
		delegationById: Map<string, BoardDelegation>;
		roleName: (target: Target) => string;
	}

	let { groups, merged, delegationById, roleName }: Props = $props();

	const wishesById = $derived(
		new Map([...delegationById].map(([id, delegation]) => [id, delegation.appliedForRoles]))
	);

	/** The wish column: the rank of the new role, or that it was not wished; empty without one. */
	function wishLabel(group: AssignmentGroup) {
		const wish = wishStatus(wishesById.get(group.delegationId ?? ''), group.target);
		if (!wish) return '';
		return wish.rank === undefined
			? m.assignmentNoWish()
			: m.assignmentWishRank({ rank: wish.rank });
	}
</script>

<div class="overflow-x-auto">
	<table class="table-sm table">
		<thead>
			<tr>
				<th>{m.assignmentApplication()}</th>
				<th>{m.assignmentFrom()}</th>
				<th>{m.assignmentTo()}</th>
				<th>{m.assignmentWish()}</th>
			</tr>
		</thead>
		<tbody>
			{#each groups as group (group.key)}
				<tr>
					<td>
						{codenamize(group.delegationId ?? group.singleParticipantId ?? group.key)}
						<span class="badge badge-xs">{group.size}</span>
						{#if group.part}
							<span class="badge badge-xs badge-info">{m.assignmentSplitPart()}</span>
						{/if}
						{#if group.singleParticipantId}
							<span class="badge badge-xs badge-info">{m.assignmentConvertedSingle()}</span>
						{/if}
					</td>
					<td>{roleName(group.liveTarget)}</td>
					<td>
						{roleName(group.target)}
						{#if merged.has(targetKey(group.target) ?? '')}
							<span class="badge badge-xs badge-warning">{m.assignmentMerged()}</span>
						{/if}
					</td>
					<td>{wishLabel(group)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
