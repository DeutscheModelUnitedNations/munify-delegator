<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { UserCardTab } from './userCardTabs';

	interface Props {
		tabs: readonly UserCardTab[];
		activeTab: UserCardTab;
		onTabChange: (tab: UserCardTab) => void;
	}

	let { tabs, activeTab, onTabChange }: Props = $props();

	type BarTab = Exclude<UserCardTab, 'person'>;
	const isBarTab = (tab: UserCardTab): tab is BarTab => tab !== 'person';

	const TAB_META: Record<BarTab, { icon: string; label: () => string }> = {
		overview: { icon: 'ph-squares-four', label: () => m.overview() },
		registration: { icon: 'ph-chair', label: () => m.userCardTabRegistrationSeat() },
		formalities: { icon: 'ph-clipboard-text', label: () => m.userCardTabFormalities() },
		onSite: { icon: 'ph-calendar-check', label: () => m.userCardTabOnSite() },
		papers: { icon: 'ph-file-text', label: () => m.userCardTabPapers() },
		history: { icon: 'ph-clock-counter-clockwise', label: () => m.userCardTabHistory() }
	};
</script>

<div class="overflow-x-auto" data-vaul-no-drag data-tour="team.userCard.tabs">
	<div role="tablist" class="tabs tabs-border flex-nowrap">
		{#each tabs.filter(isBarTab) as tab (tab)}
			{@const meta = TAB_META[tab]}
			<button
				role="tab"
				aria-selected={activeTab === tab}
				aria-label={meta.label()}
				class="tab gap-1.5 whitespace-nowrap {activeTab === tab ? 'tab-active' : ''}"
				onclick={() => onTabChange(tab)}
			>
				<i aria-hidden="true" class="ph-duotone {meta.icon} text-xs"></i>
				<!-- On a phone only the open tab says its name; the others are told apart by icon -->
				<span class={activeTab === tab ? '' : 'hidden sm:inline'}>{meta.label()}</span>
			</button>
		{/each}
	</div>
</div>
