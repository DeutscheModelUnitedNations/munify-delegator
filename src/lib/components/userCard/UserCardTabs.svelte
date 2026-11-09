<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { UserCardTab } from './userCardTabs';

	interface Props {
		tabs: readonly UserCardTab[];
		activeTab: UserCardTab;
		onTabChange: (tab: UserCardTab) => void;
	}

	let { tabs, activeTab, onTabChange }: Props = $props();

	const TAB_META: Record<UserCardTab, { icon: string; label: () => string }> = {
		person: { icon: 'ph-user', label: () => m.userCardTabPerson() },
		registration: { icon: 'ph-note-pencil', label: () => m.userCardTabRegistration() },
		seat: { icon: 'ph-chair', label: () => m.userCardTabSeat() },
		formalities: { icon: 'ph-clipboard-text', label: () => m.userCardTabFormalities() },
		conference: { icon: 'ph-calendar-check', label: () => m.accessAndAttendance() },
		surveys: { icon: 'ph-chart-pie', label: () => m.survey() },
		calendar: { icon: 'ph-calendar-dots', label: () => m.calendar() },
		papers: { icon: 'ph-file-text', label: () => m.userCardTabPapers() },
		history: { icon: 'ph-clock-counter-clockwise', label: () => m.userCardTabHistory() }
	};
</script>

<div class="overflow-x-auto px-3 sm:px-5 md:px-10 lg:px-16" data-vaul-no-drag>
	<div role="tablist" class="tabs tabs-border flex-nowrap">
		{#each tabs as tab (tab)}
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
