<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	export type UserCardTab =
		| 'userData'
		| 'status'
		| 'surveys'
		| 'role'
		| 'delegation'
		| 'papers'
		| 'supervisors'
		| 'students'
		| 'history';

	interface Props {
		activeTab: UserCardTab;
		onTabChange: (tab: UserCardTab) => void;
		showDelegation?: boolean;
		showPapers?: boolean;
		showSupervisors?: boolean;
		showStudents?: boolean;
	}

	let {
		activeTab,
		onTabChange,
		showDelegation = false,
		showPapers = false,
		showSupervisors = false,
		showStudents = false
	}: Props = $props();

	const tabs: { id: UserCardTab; icon: string; label: string; condition: boolean }[] = $derived([
		{ id: 'userData', icon: 'fa-user', label: m.adminUserCardDetails(), condition: true },
		{ id: 'status', icon: 'fa-clipboard-check', label: m.adminUserCardStatus(), condition: true },
		{ id: 'surveys', icon: 'fa-chart-pie', label: m.survey(), condition: true },
		{ id: 'role', icon: 'fa-id-badge', label: m.adminUserCardRole(), condition: true },
		{
			id: 'delegation',
			icon: 'fa-users-viewfinder',
			label: m.delegation(),
			condition: showDelegation
		},
		{
			id: 'papers',
			icon: 'fa-file-lines',
			label: m.userCardTabPapers(),
			condition: showPapers
		},
		{
			id: 'supervisors',
			icon: 'fa-chalkboard-user',
			label: m.supervisors(),
			condition: showSupervisors
		},
		{
			id: 'students',
			icon: 'fa-graduation-cap',
			label: m.userCardTabStudents(),
			condition: showStudents
		},
		{
			id: 'history',
			icon: 'fa-clock-rotate-left',
			label: m.userCardTabHistory(),
			condition: true
		}
	]);
</script>

<div class="overflow-x-auto px-5 md:px-10 lg:px-16" data-vaul-no-drag>
	<div role="tablist" class="tabs tabs-border flex-nowrap">
		{#each tabs.filter((t) => t.condition) as tab (tab.id)}
			<button
				role="tab"
				class="tab whitespace-nowrap gap-1.5 {activeTab === tab.id ? 'tab-active' : ''}"
				onclick={() => onTabChange(tab.id)}
			>
				<i class="fa-duotone {tab.icon} text-xs"></i>
				<span class="hidden sm:inline">{tab.label}</span>
			</button>
		{/each}
	</div>
</div>
