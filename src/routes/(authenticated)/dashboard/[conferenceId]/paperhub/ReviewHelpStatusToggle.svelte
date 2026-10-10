<script lang="ts">
	import type { ReviewhelpstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	/** Whether reviewers of an agenda item want help, as a button that cycles through the options. */
	interface Props {
		status: ReviewhelpstatusEnum;
		onCycle: () => void;
	}

	let { status, onCycle }: Props = $props();

	const appearance = {
		HELP_NEEDED: {
			tooltip: 'tooltip-warning',
			tip: () => m.reviewHelpNeeded(),
			icon: 'fa-hand text-warning'
		},
		NO_HELP_WANTED: {
			tooltip: 'tooltip-success',
			tip: () => m.reviewHelpNotWanted(),
			icon: 'fa-check-circle text-success'
		},
		UNSPECIFIED: {
			tooltip: '',
			tip: () => m.reviewHelpStatusTooltip(),
			icon: 'fa-question-circle text-base-content/30'
		}
	} satisfies Record<ReviewhelpstatusEnum, { tooltip: string; tip: () => string; icon: string }>;

	const current = $derived(appearance[status]);
</script>

<div class="tooltip tooltip-right {current.tooltip}" data-tip={current.tip()}>
	<button
		class="btn btn-ghost btn-sm btn-square"
		aria-label={m.reviewHelpStatusTooltip()}
		onclick={(e) => {
			e.stopPropagation();
			onCycle();
		}}
	>
		<i class="fa-sharp-duotone fa-solid {current.icon} text-base"></i>
	</button>
</div>
