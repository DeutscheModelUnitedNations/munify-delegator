<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { slide } from 'svelte/transition';

	/**
	 * Picks options of the conference's survey questions, with a choice standing for none of them
	 * (a calendar entry's audience, the choice a scanner session expects).
	 */
	interface Props {
		conferenceId: string;
		selected: string[];
		legend: string;
		/** The label of the choice that clears the selection. */
		noneLabel: string;
		hint: string;
		/** Folds the options away behind the legend until they are asked for. */
		collapsible?: boolean;
	}

	let {
		conferenceId,
		selected = $bindable(),
		legend,
		noneLabel,
		hint,
		collapsible = false
	}: Props = $props();

	const surveyQuestions = $derived(
		await client.liveQuery.surveyQuestions({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'asc' }
			},
			id: true,
			title: true,
			options: { id: true, title: true }
		})
	);

	/** Whether a collapsible picker shows its options. */
	let expanded = $state(false);

	function toggle(id: string, picked: boolean) {
		selected = picked ? [...selected, id] : selected.filter((optionId) => optionId !== id);
	}
</script>

{#snippet options()}
	<div class="flex flex-col gap-3">
		<label class="label cursor-pointer gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={selected.length === 0}
				disabled={selected.length === 0}
				onchange={() => (selected = [])}
			/>
			<span class="text-base-content">{noneLabel}</span>
		</label>
		{#each surveyQuestions as question (question.id)}
			<div>
				<div class="text-base-content/60 mb-1 text-xs font-semibold">{question.title}</div>
				<div class="flex flex-wrap gap-x-4 gap-y-1">
					{#each question.options as option (option.id)}
						<label class="label cursor-pointer gap-2">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-primary"
								checked={selected.includes(option.id)}
								onchange={(event) => toggle(option.id, event.currentTarget.checked)}
							/>
							<span class="text-base-content">{option.title}</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<p class="label whitespace-normal">{hint}</p>
{/snippet}

{#if surveyQuestions.length > 0 && collapsible}
	<div class="rounded-box bg-base-100/40">
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-2 p-2 text-left text-sm font-semibold"
			aria-expanded={expanded}
			onclick={() => (expanded = !expanded)}
		>
			{legend}
			<span class="badge badge-soft badge-sm {selected.length > 0 ? 'badge-primary' : ''}">
				{selected.length > 0 ? selected.length : noneLabel}
			</span>
			<i
				class="fa-sharp-duotone fa-solid fa-chevron-down ml-auto text-xs transition-transform duration-200 {expanded
					? 'rotate-180'
					: ''}"
			></i>
		</button>
		{#if expanded}
			<div class="flex flex-col gap-2 px-2 pb-2" transition:slide={{ duration: 200 }}>
				{@render options()}
			</div>
		{/if}
	</div>
{:else if surveyQuestions.length > 0}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{legend}</legend>
		{@render options()}
	</fieldset>
{/if}
