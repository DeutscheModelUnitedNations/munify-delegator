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
		person: { icon: 'fa-user', label: () => m.userCardTabPerson() },
		registration: { icon: 'fa-file-pen', label: () => m.userCardTabRegistration() },
		seat: { icon: 'fa-chair-office', label: () => m.userCardTabSeat() },
		formalities: { icon: 'fa-clipboard-check', label: () => m.userCardTabFormalities() },
		conference: { icon: 'fa-calendar-check', label: () => m.accessAndAttendance() },
		surveys: { icon: 'fa-chart-pie', label: () => m.survey() },
		papers: { icon: 'fa-file-lines', label: () => m.userCardTabPapers() },
		history: { icon: 'fa-clock-rotate-left', label: () => m.userCardTabHistory() }
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
				<i class="fa-sharp-duotone fa-solid {meta.icon} text-xs"></i>
				<!-- On a phone only the open tab says its name; the others are told apart by icon -->
				<span class={activeTab === tab ? '' : 'hidden sm:inline'}>{meta.label()}</span>
			</button>
		{/each}
	</div>
</div>
