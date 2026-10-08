<script lang="ts">
	import { wishStatus } from '$lib/assignment/board';
	import { targetKey, type AssignmentGroup, type Target } from '$lib/assignment/state';
	import Flag from '$lib/components/Flag.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';
	import type { BoardDelegation } from '../board';
	import { sightingHref } from '../sightingLink';

	/** The groups applying the draft gives a different role, before and after. */
	interface Props {
		groups: AssignmentGroup[];
		merged: Set<string>;
		delegationById: Map<string, BoardDelegation>;
		/** How a role is shown: its name and its flag (or icon); undefined for no role. */
		describeTarget: (
			target: Target
		) => { title: string; alpha2Code?: string; icon?: string } | undefined;
		conferenceId: string;
	}

	let { groups, merged, delegationById, describeTarget, conferenceId }: Props = $props();

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

{#snippet role(target: Target)}
	{@const described = describeTarget(target)}
	{#if described}
		<span class="inline-flex items-center gap-2">
			<Flag
				alpha2Code={described.alpha2Code}
				nsa={!described.alpha2Code}
				icon={described.icon}
				size="xs"
			/>
			{described.title}
		</span>
	{:else}
		{m.assignmentNoRole()}
	{/if}
{/snippet}

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
				{@const applicationId = group.delegationId ?? group.singleParticipantId}
				<tr>
					<td>
						{#if applicationId}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved in sightingHref -->
							<a
								class="link link-hover"
								href={sightingHref(conferenceId, applicationId)}
								title={m.assignmentCardSighting()}
							>
								{codenamize(applicationId)}
							</a>
						{:else}
							{codenamize(group.key)}
						{/if}
						<span class="badge badge-xs">{group.size}</span>
						{#if group.part}
							<span class="badge badge-xs badge-info">{m.assignmentSplitPart()}</span>
						{/if}
						{#if group.singleParticipantId}
							<span class="badge badge-xs badge-info">{m.assignmentConvertedSingle()}</span>
						{/if}
					</td>
					<td>{@render role(group.liveTarget)}</td>
					<td>
						{@render role(group.target)}
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
