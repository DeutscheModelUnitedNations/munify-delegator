<script lang="ts" module>
	export type ChecklistStatus = 'DONE' | 'PROBLEM' | 'PENDING' | 'NOT_YET_POSSIBLE';
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * The formal steps of taking part, as a checklist: what is still open, and - struck through, so
	 * the progress shows - what is done. It only reports; the steps are taken elsewhere, which an open
	 * step's `href` can lead to.
	 */
	interface Props {
		/** `hint` is a short note beside the task, such as its deadline. */
		steps: { task: string; status: ChecklistStatus; hint?: string; href?: string }[];
		/** Explains the open statuses under the list; off where they need no explaining. */
		legend?: boolean;
	}

	let { steps, legend = true }: Props = $props();

	const looks: Record<
		ChecklistStatus,
		{ icon: string; mark: string; badge: string; task: string }
	> = {
		DONE: {
			icon: 'check',
			mark: 'bg-success text-success-content',
			badge: 'badge-success',
			task: 'text-base-content/50 line-through decoration-success decoration-2'
		},
		PROBLEM: {
			icon: 'exclamation',
			mark: 'bg-error text-error-content',
			badge: 'badge-error',
			task: ''
		},
		PENDING: {
			icon: '',
			mark: 'border-2 border-warning',
			badge: 'badge-warning',
			task: ''
		},
		NOT_YET_POSSIBLE: {
			icon: 'lock',
			mark: 'bg-base-300 text-base-content/50',
			badge: 'badge-ghost',
			task: 'text-base-content/60'
		}
	};

	const labels: Record<ChecklistStatus, () => string> = {
		DONE: m.statusLegendDone,
		PROBLEM: m.statusShortProblem,
		PENDING: m.statusShortPending,
		NOT_YET_POSSIBLE: m.statusShortNotYetPossible
	};

	/** What an open status means, said once under the list rather than on every row. */
	const explanations: Partial<Record<ChecklistStatus, () => string>> = {
		PROBLEM: m.statusLegendProblem,
		PENDING: m.statusLegendPending,
		NOT_YET_POSSIBLE: m.statusLegendNotYetPossible
	};

	let done = $derived(steps.filter((step) => step.status === 'DONE').length);
	let notes = $derived(
		(['PROBLEM', 'PENDING', 'NOT_YET_POSSIBLE'] as const).filter((status) =>
			steps.some((step) => step.status === status)
		)
	);
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center gap-4">
		<progress class="progress progress-success flex-1" value={done} max={steps.length}></progress>
		<span class="text-sm font-medium whitespace-nowrap">
			{done === steps.length ? m.allComplete() : m.checklistProgress({ done, total: steps.length })}
		</span>
	</div>

	<ul class="grid gap-x-8 md:grid-cols-2">
		{#each steps as step (step.task)}
			{@const look = looks[step.status]}
			<li class="border-base-300 flex items-center gap-3 border-b py-3">
				<span class="flex size-7 shrink-0 items-center justify-center rounded-full {look.mark}">
					{#if look.icon}
						<i class="fa-solid fa-{look.icon} text-sm"></i>
					{/if}
				</span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="font-medium {look.task}">
						{#if step.href}
							<a class="link link-hover" href={step.href}>{step.task}</a>
						{:else}
							{step.task}
						{/if}
					</span>
					{#if step.hint && step.status !== 'DONE'}
						<span class="text-base-content/60 text-xs">{step.hint}</span>
					{/if}
				</span>
				<span class="badge badge-soft badge-sm {look.badge}">{labels[step.status]()}</span>
			</li>
		{/each}
	</ul>

	{#if legend && notes.length > 0}
		<ul class="text-base-content/60 flex flex-col gap-1 text-xs">
			{#each notes as status (status)}
				<li>{explanations[status]?.()}</li>
			{/each}
		</ul>
	{/if}
</div>
