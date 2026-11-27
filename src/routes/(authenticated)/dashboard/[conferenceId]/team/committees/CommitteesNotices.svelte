<!--
	@component
	The notes above the committees page: read-only for those who may not edit, and where the seats
	are planned for those who plan them.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		readOnly: boolean;
		showSeatPlanningHint: boolean;
	}

	let { conferenceId, readOnly, showSeatPlanningHint }: Props = $props();
</script>

{#if readOnly}
	<div role="status" class="alert alert-info alert-soft text-sm">
		<i aria-hidden="true" class="ph-duotone ph-lock"></i>
		<span>{m.committeesReadOnly()}</span>
	</div>
{/if}
{#if showSeatPlanningHint}
	<div
		role="note"
		class="alert alert-info alert-soft text-sm"
		data-tour="team.committees.seat-planning-hint"
	>
		<i aria-hidden="true" class="ph-duotone ph-table"></i>
		<span>{m.committeesSeatPlanningHint()}</span>
		<a
			class="btn btn-sm btn-ghost"
			href={resolve('/(authenticated)/dashboard/[conferenceId]/team/seat-planning', {
				conferenceId
			})}
		>
			{m.seatPlanningOpen()}
			<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
		</a>
	</div>
{/if}
