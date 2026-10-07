<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';
	import {
		getHistory,
		getSelectedHistory,
		setHistory,
		setSelectedHistory,
		statsQueryFilter,
		type HistoryStats,
		type StatsTypeHistoryEntry
	} from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	// Today's snapshot: exactly the figures the widgets compare against a past day.
	const snapshot = $derived(
		await client.liveQuery.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			registered: {
				total: true,
				applied: true,
				notApplied: true,
				supervisors: true,
				singleParticipants: {
					byRole: { total: true, applied: true, notApplied: true }
				}
			},
			roleBased: {
				delegationMembersWithRole: true,
				delegationMembersWithoutRole: true,
				singleParticipantsWithRole: true,
				singleParticipantsWithoutRole: true
			},
			paperStats: {
				total: true,
				withReviews: true,
				withoutReviews: true,
				byStatus: { accepted: true }
			}
		})
	);

	/** Field by field, so the stored entry is plain data rather than the client's proxy. */
	function toHistoryStats(): HistoryStats {
		const { registered, roleBased, paperStats } = snapshot;
		return {
			registered: {
				total: registered.total,
				applied: registered.applied,
				notApplied: registered.notApplied,
				supervisors: registered.supervisors,
				singleParticipants: {
					byRole: registered.singleParticipants.byRole.map((role) => ({
						total: role.total,
						applied: role.applied,
						notApplied: role.notApplied
					}))
				}
			},
			roleBased: {
				delegationMembersWithRole: roleBased.delegationMembersWithRole,
				delegationMembersWithoutRole: roleBased.delegationMembersWithoutRole,
				singleParticipantsWithRole: roleBased.singleParticipantsWithRole,
				singleParticipantsWithoutRole: roleBased.singleParticipantsWithoutRole
			},
			paperStats: {
				total: paperStats.total,
				withReviews: paperStats.withReviews,
				withoutReviews: paperStats.withoutReviews,
				byStatus: { accepted: paperStats.byStatus.accepted }
			}
		};
	}

	onMount(() => {
		const today = format(Date.now(), 'yyyy-MM-dd');
		const history: StatsTypeHistoryEntry[] = JSON.parse(
			localStorage.getItem('statsHistory') ?? '[]'
		);

		if (!history.find((x) => `${x.timestamp}_${x.conferenceId}` === `${today}_${conferenceId}`)) {
			history.unshift({ stats: toHistoryStats(), timestamp: today, conferenceId });
		}
		setHistory(history);

		localStorage.setItem('statsHistory', JSON.stringify(history));

		setHistory(history.filter((x) => x.conferenceId === conferenceId));
		setSelectedHistory(history.find((x) => x.timestamp !== today)?.timestamp);
	});
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-clock-rotate-left text-base-content/70"></i>
			{m.historyComparison()}
		</h2>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p class="text-sm text-base-content/70">{@html m.historyComparisonDescription()}</p>
		<select
			class="select select-bordered w-full max-w-xs bg-base-100"
			onchange={(e) => setSelectedHistory(e.currentTarget.value)}
		>
			{#each getHistory()?.map((x) => x.timestamp) ?? [] as timestamp (timestamp)}
				<option selected={timestamp === getSelectedHistory()}>
					{timestamp}
				</option>
			{/each}
			{#if getHistory()?.length === 0 || getHistory() === undefined}
				<option selected disabled>{m.noHistory()}</option>
			{/if}
		</select>
	</div>
</section>
