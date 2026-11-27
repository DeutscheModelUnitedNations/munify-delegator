<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import Table from '#lib/components/table/Table.svelte';
	import RolePopularityHeader from './RolePopularityHeader.svelte';
	import RolePopularityRow from './RolePopularityRow.svelte';
	import RolePopularitySeatFilter from './RolePopularitySeatFilter.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { statsQueryFilter } from '../stats.svelte';
	import {
		nextPopularitySort,
		popularityRowsOf,
		seatCountsOf,
		type PopularitySort,
		type PopularitySortKey
	} from './rolePopularityTable';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			rolePopularity: {
				roleId: true,
				nationAlpha3Code: true,
				nationAlpha2Code: true,
				name: true,
				icon: true,
				seats: true,
				applications: true,
				firstChoice: true,
				secondChoice: true,
				thirdChoice: true,
				laterChoice: true,
				weightedPopularity: true
			}
		})
	);
	const roles = $derived(stats.rolePopularity);

	type Role = (typeof roles)[number];

	const nameOf = (role: Role) =>
		role.nationAlpha3Code
			? getFullTranslatedCountryNameFromISO3Code(role.nationAlpha3Code)
			: (role.name ?? '');

	/** Undefined shows every seat count. */
	let seats = $state<number | undefined>(undefined);
	/** Undefined is the default order: by seats, least popular first. */
	let sort = $state<PopularitySort | undefined>(undefined);

	const seatCounts = $derived(seatCountsOf(roles));
	const rows = $derived(popularityRowsOf({ rows: roles, seats, sort, nameOf }));
	/** Without a column sort the rows come in seat groups, each with a heading row. */
	const grouped = $derived(sort === undefined && seats === undefined);

	const popularityFormat = $derived(
		new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 })
	);

	const columns: { key: PopularitySortKey; label: () => string; numeric: boolean }[] = [
		{ key: 'name', label: () => m.role(), numeric: false },
		{ key: 'seats', label: () => m.seats(), numeric: true },
		{ key: 'applications', label: () => m.statsRolePopularityApplications(), numeric: true },
		{ key: 'firstChoice', label: () => m.statsRolePopularityFirst(), numeric: true },
		{ key: 'secondChoice', label: () => m.statsRolePopularitySecond(), numeric: true },
		{ key: 'thirdChoice', label: () => m.statsRolePopularityThird(), numeric: true },
		{ key: 'laterChoice', label: () => m.statsRolePopularityLater(), numeric: true },
		{ key: 'weightedPopularity', label: () => m.statsRolePopularityWeighted(), numeric: true }
	];

	const sortedBy = (key: PopularitySortKey): false | 'asc' | 'desc' => {
		if (sort?.key !== key) return false;
		return sort.descending ? 'desc' : 'asc';
	};
</script>

<section
	class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12"
	data-tour="team.stats.rolePopularity"
	aria-labelledby="stats-role-popularity-title"
>
	<div class="card-body p-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h2 id="stats-role-popularity-title" class="card-title text-base font-semibold">
					<i aria-hidden="true" class="ph-duotone ph-ranking text-base-content/70"></i>
					{m.statsRolePopularity()}
				</h2>
				<p class="text-xs text-base-content/70 max-w-prose">
					{m.statsRolePopularityDescription()}
				</p>
			</div>
			{#if seatCounts.length > 1}
				<RolePopularitySeatFilter {seatCounts} {seats} onChange={(value) => (seats = value)} />
			{/if}
		</div>

		{#if roles.length === 0}
			<div class="flex h-24 items-center justify-center text-sm opacity-50">
				{m.statsRolePopularityEmpty()}
			</div>
		{:else}
			<Table class="table-sm" wrapperClass="max-h-[70vh] w-full max-sm:max-h-none">
				<thead>
					<tr>
						{#each columns as column (column.key)}
							<RolePopularityHeader
								label={column.label()}
								numeric={column.numeric}
								sorted={sortedBy(column.key)}
								onSort={() => (sort = nextPopularitySort({ current: sort, key: column.key }))}
							/>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as role, index (role.roleId)}
						{#if grouped && role.seats !== rows[index - 1]?.seats}
							<tr class="bg-base-300/60">
								<td colspan={columns.length} class="text-xs font-semibold">
									{m.statsRolePopularitySeatGroup({ count: role.seats })}
								</td>
							</tr>
						{/if}
						<RolePopularityRow {role} name={nameOf(role)} format={popularityFormat} />
					{/each}
				</tbody>
			</Table>
		{/if}
	</div>
</section>
