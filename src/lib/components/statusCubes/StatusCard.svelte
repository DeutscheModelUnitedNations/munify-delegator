<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		status: 'DONE' | 'PROBLEM' | 'PENDING' | 'NOT_YET_POSSIBLE';
		task: string;
		faIcon: string;
		customDescription?: string;
	}

	let { status, task, faIcon, customDescription }: Props = $props();

	type Status = Props['status'];

	/** `icon: undefined` shows the task's own icon. */
	const statusStyles: Record<Status, { icon?: string; colorClass: string; bgClass: string }> = {
		DONE: {
			icon: 'circle-check',
			colorClass: 'text-success',
			bgClass: 'bg-success/20 border border-success/30'
		},
		PROBLEM: {
			icon: 'triangle-exclamation',
			colorClass: 'text-error',
			bgClass: 'bg-error/20 border border-error/30'
		},
		PENDING: {
			colorClass: 'text-warning',
			bgClass: 'bg-warning/20 border border-warning/30'
		},
		NOT_YET_POSSIBLE: {
			icon: 'lock',
			colorClass: 'text-base-content/50',
			bgClass: 'bg-base-200'
		}
	};

	const descriptions: Record<Status, () => string> = {
		DONE: m.statusLegendDone,
		PROBLEM: m.statusLegendProblem,
		PENDING: m.statusLegendPending,
		NOT_YET_POSSIBLE: m.statusLegendNotYetPossible
	};

	const getStatusStyles = (status: Status) => {
		const styles = statusStyles[status] ?? statusStyles.NOT_YET_POSSIBLE;
		return { ...styles, icon: styles.icon ?? faIcon };
	};

	const getDescription = (status: Status) => descriptions[status]?.() ?? '';

	let { icon, colorClass, bgClass } = $derived(getStatusStyles(status));
	let description = $derived(customDescription ?? getDescription(status));
	let isDisabled = $derived(status === 'NOT_YET_POSSIBLE');
</script>

<div class="card {bgClass} {isDisabled ? 'cursor-not-allowed opacity-50' : ''}">
	<div class="card-body">
		<div class="flex items-center gap-3">
			<i class="fa-sharp-duotone fa-solid fa-{icon.replace('fa-', '')} text-2xl {colorClass}"></i>
			<h2 class="card-title">{task}</h2>
		</div>
		<p class={isDisabled ? 'text-base-content/50' : 'text-base-content/70'}>{description}</p>
	</div>
</div>
