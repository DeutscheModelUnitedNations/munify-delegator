<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { UserCardTab } from './userCardTabs';

	interface Props {
		tabs: readonly UserCardTab[];
		activeTab: UserCardTab;
		onTabChange: (tab: UserCardTab) => void;
		/** Another icon for the formalities, given the usual one */
		formalitiesIcon?: Snippet<[icon: string]>;
	}

	let { tabs, activeTab, onTabChange, formalitiesIcon }: Props = $props();

	const TAB_META: Record<UserCardTab, { icon: string; label: () => string }> = {
		person: { icon: 'ph-user', label: () => m.userCardTabPerson() },
		registration: { icon: 'ph-chair', label: () => m.userCardTabRegistrationSeat() },
		formalities: { icon: 'ph-clipboard-text', label: () => m.userCardTabFormalitiesAccess() },
		program: { icon: 'ph-calendar-dots', label: () => m.userCardTabProgramPapers() },
		history: { icon: 'ph-clock-counter-clockwise', label: () => m.userCardTabHistory() }
	};
</script>

<div class="overflow-x-auto" data-vaul-no-drag data-tour="team.userCard.tabs">
	<div role="tablist" class="tabs tabs-border flex-nowrap max-sm:justify-between">
		{#each tabs as tab (tab)}
			{@const meta = TAB_META[tab]}
			<button
				role="tab"
				aria-selected={activeTab === tab}
				class="tab shrink-0 flex-nowrap gap-1.5 whitespace-nowrap max-sm:[--tab-p:0.375rem] {activeTab ===
				tab
					? 'tab-active'
					: ''}"
				onclick={() => onTabChange(tab)}
			>
				{#if tab === 'formalities' && formalitiesIcon}
					{@render formalitiesIcon(meta.icon)}
				{:else}
					<i aria-hidden="true" class="ph-duotone {meta.icon} text-lg"></i>
				{/if}
				<!-- On a phone only the open tab says its name; the others are told apart by icon -->
				<span class={activeTab === tab ? '' : 'sr-only sm:not-sr-only'}>{meta.label()}</span>
			</button>
		{/each}
	</div>
</div>
