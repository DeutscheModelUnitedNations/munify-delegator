<script lang="ts">
	import type { RequiredApplication } from '#lib/assignment/seatChecks.js';
	import codenamize from '#lib/helpers/codenamize.js';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * What applying the draft would do that is allowed but worth a second look: required
	 * applications left without a seat, and every seat taken, with none left for whoever the
	 * waiting list has to fill in. Shown on the summary and again when applying.
	 */
	interface Props {
		missingRequired: readonly RequiredApplication[];
		occupancy: { total: number; free: number };
	}

	let { missingRequired, occupancy }: Props = $props();

	const nameOf = (application: RequiredApplication) =>
		codenamize(
			'delegationId' in application ? application.delegationId : application.singleParticipantId
		);
	/** Where the board shows it: its group size, or among the single participants. */
	const bracketOf = (application: RequiredApplication) =>
		'delegationId' in application
			? application.size === undefined
				? undefined
				: String(application.size)
			: m.assignmentTabSingles();
	const allTaken = $derived(occupancy.total > 0 && occupancy.free === 0);
</script>

{#if missingRequired.length > 0}
	<div class="alert alert-warning alert-soft" role="status">
		<i class="fa-sharp-duotone fa-solid fa-thumbtack text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.assignmentRequiredWithoutSeatTitle()}</h3>
			<ul class="list-inside list-disc text-sm">
				{#each missingRequired as application (nameOf(application))}
					{@const bracket = bracketOf(application)}
					<li>
						{m.assignmentRequiredWithoutSeat({
							name: bracket ? `${nameOf(application)} (${bracket})` : nameOf(application)
						})}
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
{#if allTaken}
	<div class="alert alert-warning alert-soft" role="status">
		<i class="fa-sharp-duotone fa-solid fa-chair text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.assignmentSeatsAllTakenTitle()}</h3>
			<p class="text-sm">{m.assignmentSeatsAllTaken({ total: occupancy.total })}</p>
		</div>
	</div>
{/if}
