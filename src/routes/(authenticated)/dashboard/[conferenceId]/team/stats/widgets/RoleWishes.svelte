<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Bar3DChart from '#lib/components/charts/echarts/Bar3DChart.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { statsQueryFilter } from '../stats.svelte';
	import {
		ROLE_WISH_CHART_LIMIT,
		hasWishesOfKind,
		roleWishChart,
		type RoleWishes
	} from './roleWishChart';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			roleWishes: {
				roleId: true,
				kind: true,
				nationAlpha3Code: true,
				name: true,
				total: true,
				granted: true,
				byRank: { rank: true, count: true, granted: true }
			}
		})
	);
	const roles = $derived(stats.roleWishes);

	const kinds = [
		{ kind: 'NATION', label: () => m.nations() },
		{ kind: 'NON_STATE_ACTOR', label: () => m.nonStateActors() }
	] as const;
	const offeredKinds = $derived(kinds.filter(({ kind }) => hasWishesOfKind({ roles, kind })));
	let chosenKind = $state<RoleWishes['kind']>('NATION');
	// The first kind with wishes while the chosen one has none (a conference without NSAs).
	const kind = $derived(
		offeredKinds.some((offered) => offered.kind === chosenKind)
			? chosenKind
			: (offeredKinds[0]?.kind ?? 'NATION')
	);

	function roleLabel(role: RoleWishes) {
		return role.nationAlpha3Code
			? getFullTranslatedCountryNameFromISO3Code(role.nationAlpha3Code)
			: (role.name ?? '');
	}

	const chart = $derived(
		roleWishChart({
			roles,
			kind,
			labels: {
				role: roleLabel,
				rank: (rank) => m.statsWishRank({ rank }),
				roles: m.statsWishRoles(),
				ranks: m.statsWishPlace(),
				delegations: m.delegations(),
				granted: m.statsWishGranted(),
				notGranted: m.statsWishNotGranted()
			}
		})
	);
	const ofKind = $derived(roles.filter((role) => role.kind === kind));
	// The table lists every role of the kind, so its places can reach further than the chart's.
	const tableRanks = $derived(
		Array.from(
			{ length: Math.max(0, ...ofKind.flatMap((role) => role.byRank.map((wish) => wish.rank))) },
			(_, index) => index + 1
		)
	);
	const firstWishes = (role: RoleWishes) => role.byRank.find((wish) => wish.rank === 1)?.count ?? 0;
</script>

<!-- Hidden entirely while there is nothing to show. -->
{#if offeredKinds.length > 0}
	<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
		<div class="card-body p-4 gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="card-title text-base font-semibold">
					<i aria-hidden="true" class="ph-duotone ph-cube text-base-content/70"></i>
					{m.statsRoleWishes()}
				</h2>
				{#if offeredKinds.length > 1}
					<div class="join" role="group" aria-label={m.statsWishKind()}>
						{#each offeredKinds as offered (offered.kind)}
							<button
								type="button"
								class="btn btn-sm join-item"
								class:btn-primary={kind === offered.kind}
								aria-pressed={kind === offered.kind}
								onclick={() => (chosenKind = offered.kind)}
							>
								{offered.label()}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<p class="text-sm text-base-content/70">
				{m.statsRoleWishesDescription({ limit: ROLE_WISH_CHART_LIMIT })}
			</p>

			<Bar3DChart data={chart} label={m.statsRoleWishes()} />

			<details class="collapse collapse-arrow border border-base-300">
				<summary class="collapse-title py-2 min-h-0 text-sm font-medium">
					{m.statsShowAsTable()}
				</summary>
				<div class="collapse-content overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th scope="col">{m.statsWishRoles()}</th>
								{#each tableRanks as rank (rank)}
									<th scope="col" class="text-right">{m.statsWishRank({ rank })}</th>
								{/each}
								<th scope="col" class="text-right">{m.total()}</th>
								<th scope="col" class="text-right">{m.statsWishGranted()}</th>
							</tr>
						</thead>
						<tbody>
							{#each ofKind as role (role.roleId)}
								<tr>
									<th scope="row" class="font-normal">{roleLabel(role)}</th>
									{#each tableRanks as rank (rank)}
										<td class="text-right tabular-nums">
											{role.byRank.find((wish) => wish.rank === rank)?.count ?? 0}
										</td>
									{/each}
									<td class="text-right tabular-nums font-semibold">{role.total}</td>
									<td class="text-right tabular-nums">{role.granted}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<p class="mt-2 text-xs text-base-content/60">
						{m.statsWishFirstWishShare({
							roles: ofKind.filter((role) => firstWishes(role) > 0).length,
							total: ofKind.length
						})}
					</p>
				</div>
			</details>
		</div>
	</section>
{/if}
