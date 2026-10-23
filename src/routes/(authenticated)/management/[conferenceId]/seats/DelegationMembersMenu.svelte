<script lang="ts">
	import type { SeatsQuery$result } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';

	interface Props {
		delegation: SeatsQuery$result['findManyDelegations'][number] | undefined;
		conferenceId: string;
		/** Non-state actors sit without a committee, so there is nothing to show */
		showCommittee?: boolean;
	}

	let { delegation, conferenceId, showCommittee = true }: Props = $props();

	let anchor = $state<HTMLButtonElement>();
	let popover = $state<HTMLDivElement>();
	let position = $state({ top: 0, left: 0 });

	const popoverId = $props.id();

	// the popover lives in the top layer, so it is positioned against the viewport and never clipped by
	// the table; the button opens and closes it through popovertarget, which also handles light dismiss
	const place = (event: ToggleEvent) => {
		if (event.newState !== 'open' || !anchor) return;
		const rect = anchor.getBoundingClientRect();
		position = {
			top: Math.min(rect.bottom + 4, window.innerHeight - 360),
			left: Math.max(8, rect.right - 288)
		};
	};

	const members = $derived(
		(delegation?.members ?? []).toSorted(
			(a, b) =>
				Number(b.isHeadDelegate) - Number(a.isHeadDelegate) ||
				formatNames(a.user.given_name, a.user.family_name).localeCompare(
					formatNames(b.user.given_name, b.user.family_name)
				)
		)
	);
</script>

<!-- roles without members have nobody to list -->
{#if delegation && members.length > 0}
	<div class="tooltip tooltip-left" data-tip={m.delegationMembers()}>
		<button
			bind:this={anchor}
			class="btn btn-ghost btn-sm btn-square"
			aria-label={m.delegationMembers()}
			popovertarget={popoverId}
		>
			<i class="fa-duotone fa-users"></i>
		</button>
	</div>

	<div
		bind:this={popover}
		id={popoverId}
		popover="auto"
		onbeforetoggle={place}
		class="bg-base-100 text-base-content border-base-300 rounded-box m-0 w-72 border p-0 text-left shadow-lg"
		style="top: {position.top}px; left: {position.left}px;"
	>
		<div class="border-base-300 bg-base-200 flex flex-col gap-1 border-b px-4 py-3 text-sm">
			<div class="flex items-center gap-2">
				<i class="fa-duotone fa-school w-4"></i>
				<span class="truncate">{delegation.school || '–'}</span>
			</div>
			<div class="flex items-center gap-2">
				<i class="fa-duotone fa-key w-4"></i>
				<span class="font-mono">{delegation.entryCode}</span>
			</div>
		</div>
		<ul class="menu w-full">
			{#each members as member (member.id)}
				<li>
					<button
						onclick={() => {
							popover?.hidePopover();
							openUserCard(member.user.id, conferenceId);
						}}
					>
						<span class="flex-1 truncate">
							{formatNames(member.user.given_name, member.user.family_name)}
						</span>
						{#if member.isHeadDelegate}
							<div class="tooltip tooltip-left" data-tip={m.headDelegate()}>
								<i class="fa-duotone fa-star text-warning"></i>
							</div>
						{/if}
						{#if showCommittee && member.assignedCommittee}
							<span class="badge badge-sm">{member.assignedCommittee.abbreviation}</span>
						{:else if showCommittee}
							<span class="badge badge-sm badge-warning badge-soft"
								>{m.seatSwitchNoCommittee()}</span
							>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
