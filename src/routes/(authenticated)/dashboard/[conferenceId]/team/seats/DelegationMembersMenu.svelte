<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { delegationSchoolsLabel } from '#lib/helpers/delegationSchools';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';

	interface Member {
		id: string;
		isHeadDelegate: boolean;
		school?: { name: string } | null;
		assignedCommittee?: { abbreviation: string } | null;
		user: { id: string; givenName: string; familyName: string };
	}

	interface Props {
		delegation: { entryCode: string; members: Member[] } | undefined;
		/** Non-state actors sit without a committee, so there is nothing to show */
		showCommittee?: boolean;
	}

	let { delegation, showCommittee = true }: Props = $props();

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
				formatNames({ givenName: a.user.givenName, familyName: a.user.familyName }).localeCompare(
					formatNames({ givenName: b.user.givenName, familyName: b.user.familyName })
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
			<i class="fa-sharp-duotone fa-solid fa-users"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-school w-4"></i>
				<span class="truncate">{delegationSchoolsLabel(members) ?? '–'}</span>
			</div>
			<div class="flex items-center gap-2">
				<i class="fa-sharp-duotone fa-solid fa-key w-4"></i>
				<span class="font-mono">{delegation.entryCode}</span>
			</div>
		</div>
		<ul class="menu w-full">
			{#each members as member (member.id)}
				<li>
					<button
						onclick={() => {
							popover?.hidePopover();
							openUserCard(member.user.id);
						}}
					>
						<span class="flex-1 truncate">
							{formatNames({
								givenName: member.user.givenName,
								familyName: member.user.familyName
							})}
						</span>
						{#if member.isHeadDelegate}
							<div class="tooltip tooltip-left" data-tip={m.headDelegate()}>
								<i class="fa-sharp-duotone fa-solid fa-star text-warning"></i>
							</div>
						{/if}
						{#if showCommittee && member.assignedCommittee}
							<span class="badge badge-sm">{member.assignedCommittee.abbreviation}</span>
						{:else if showCommittee}
							<span class="badge badge-sm badge-warning badge-soft">
								{m.seatSwitchNoCommittee()}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
