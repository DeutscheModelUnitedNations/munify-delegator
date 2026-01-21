<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		status: 'DONE' | 'PROBLEM' | 'PENDING' | 'NOT_YET_POSSIBLE';
		task: string;
		faIcon: string;
		customDescription?: string;
	}

	let { status, task, faIcon, customDescription }: Props = $props();

	const getStatusStyles = (status: string) => {
		switch (status) {
			case 'DONE':
				return {
					icon: 'circle-check',
					colorClass: 'text-success',
					bgClass: 'bg-success/20 border border-success/30'
				};
			case 'PROBLEM':
				return {
					icon: 'triangle-exclamation',
					colorClass: 'text-error',
					bgClass: 'bg-error/20 border border-error/30'
				};
			case 'PENDING':
				return {
					icon: faIcon,
					colorClass: 'text-warning',
					bgClass: 'bg-warning/20 border border-warning/30'
				};
			case 'NOT_YET_POSSIBLE':
				return {
					icon: 'lock',
					colorClass: 'text-base-content/50',
					bgClass: 'bg-base-200'
				};
			default:
				return {
					icon: 'lock',
					colorClass: 'text-base-content/50',
					bgClass: 'bg-base-200'
				};
		}
	};

	const getDescription = (status: string) => {
		switch (status) {
			case 'DONE':
				return m.statusLegendDone();
			case 'PROBLEM':
				return m.statusLegendProblem();
			case 'PENDING':
				return m.statusLegendPending();
			case 'NOT_YET_POSSIBLE':
				return m.statusLegendNotYetPossible();
			default:
				return '';
		}
	};

	let { icon, colorClass, bgClass } = $derived(getStatusStyles(status));
	let description = $derived(customDescription ?? getDescription(status));
	let isDisabled = $derived(status === 'NOT_YET_POSSIBLE');
</script>

<div class="card {bgClass} {isDisabled ? 'cursor-not-allowed opacity-50' : ''}">
	<div class="card-body">
		<div class="flex items-center gap-3">
			<i class="fa-solid fa-{icon.replace('fa-', '')} text-2xl {colorClass}"></i>
			<h2 class="card-title">{task}</h2>
		</div>
		<p class={isDisabled ? 'text-base-content/50' : 'text-base-content/70'}>{description}</p>
	</div>
</div>
