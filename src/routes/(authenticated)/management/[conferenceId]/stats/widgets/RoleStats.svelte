<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { PieChart } from '$lib/components/Charts/ECharts';
	import type { RoleBased } from '../stats.svelte';

	interface Props {
		roleBased: RoleBased;
	}

	let { roleBased }: Props = $props();

	const delegationData = $derived([
		{ name: m.statsWithRole(), value: roleBased.delegationMembersWithRole },
		{ name: m.statsWithoutRole(), value: roleBased.delegationMembersWithoutRole }
	]);

	const singleParticipantData = $derived([
		{ name: m.statsWithRole(), value: roleBased.singleParticipantsWithRole },
		{ name: m.statsWithoutRole(), value: roleBased.singleParticipantsWithoutRole }
	]);

	const committeeData = $derived([
		{ name: m.statsWithCommittee(), value: roleBased.delegationMembersWithCommittee },
		{ name: m.statsWithoutCommittee(), value: roleBased.delegationMembersWithoutCommittee }
	]);

	const totalWithRole = $derived(
		roleBased.delegationMembersWithRole + roleBased.singleParticipantsWithRole
	);
	const totalWithoutRole = $derived(
		roleBased.delegationMembersWithoutRole + roleBased.singleParticipantsWithoutRole
	);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-user-tag text-base-content/70"></i>
			{m.statsRoleOverview()}
		</h2>

		<!-- Summary stats -->
		<div class="stats bg-base-100 w-full">
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.statsWithRole()}</div>
				<div class="stat-value text-xl text-success">{totalWithRole}</div>
			</div>
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.statsWithoutRole()}</div>
				<div class="stat-value text-xl text-warning">{totalWithoutRole}</div>
			</div>
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.statsDelegationsAssigned()}</div>
				<div class="stat-value text-xl">{roleBased.delegationsWithAssignment}</div>
			</div>
		</div>

		<!-- Charts -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">{m.statsDelegationMembers()}</h3>
				<PieChart data={delegationData} donut height="220px" showLegend={true} />
				<div class="mt-2 text-center text-xs opacity-70">
					{roleBased.delegationMembersWithRole} / {roleBased.delegationMembersWithRole +
						roleBased.delegationMembersWithoutRole}
				</div>
			</div>

			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">{m.statsSingleParticipants()}</h3>
				<PieChart data={singleParticipantData} donut height="220px" showLegend={true} />
				<div class="mt-2 text-center text-xs opacity-70">
					{roleBased.singleParticipantsWithRole} / {roleBased.singleParticipantsWithRole +
						roleBased.singleParticipantsWithoutRole}
				</div>
			</div>

			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">{m.statsCommitteeAssignment()}</h3>
				<PieChart data={committeeData} donut height="220px" showLegend={true} />
				<div class="mt-2 text-center text-xs opacity-70">
					{roleBased.delegationMembersWithCommittee} / {roleBased.delegationMembersWithCommittee +
						roleBased.delegationMembersWithoutCommittee}
				</div>
			</div>
		</div>
	</div>
</section>
