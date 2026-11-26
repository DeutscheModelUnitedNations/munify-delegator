<script lang="ts">
	import { m } from '#lib/paraglide/messages';
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
	const panelId = $props.id();

	/** What is picked, as the folded picker sums it up. */
	const selectedTitles = $derived(
		surveyQuestions
			.flatMap((question) => question.options)
			.filter((option) => selected.includes(option.id))
			.map((option) => option.title)
	);

	function toggle({ id, picked }: { id: string; picked: boolean }) {
		selected = picked ? [...selected, id] : selected.filter((optionId) => optionId !== id);
	}
</script>

{#snippet chip({
	label,
	checked,
	disabled = false,
	onchange
}: {
	label: string;
	checked: boolean;
	disabled?: boolean;
	onchange: (picked: boolean) => void;
})}
	<label
		class={[
			'btn btn-sm has-focus-visible:outline-base-content h-auto min-h-8 gap-1.5 py-1 font-normal has-focus-visible:outline-2',
			checked ? 'btn-primary' : 'bg-base-100 border-base-content/20'
		]}
	>
		<input
			type="checkbox"
			class="sr-only"
			{checked}
			{disabled}
			onchange={(event) => onchange(event.currentTarget.checked)}
		/>
		<i aria-hidden="true" class={checked ? 'ph-fill ph-check' : 'ph-duotone ph-plus'}></i>
		{label}
	</label>
{/snippet}

{#snippet questions()}
	<div class="@container">
		<div class="grid gap-x-6 gap-y-4 @xl:grid-cols-2 @5xl:grid-cols-3">
			{#each surveyQuestions as question (question.id)}
				<div class="flex min-w-0 flex-col gap-1.5" role="group" aria-label={question.title}>
					<span class="text-sm font-semibold">{question.title}</span>
					<div class="flex flex-wrap gap-1.5">
						{#each question.options as option (option.id)}
							{@render chip({
								label: option.title,
								checked: selected.includes(option.id),
								onchange: (picked) => toggle({ id: option.id, picked })
							})}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#if surveyQuestions.length > 0 && collapsible}
	<div class="rounded-box border-base-content/10 border-2">
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-3 p-3 text-left"
			aria-expanded={expanded}
			aria-controls={panelId}
			onclick={() => (expanded = !expanded)}
		>
			<i aria-hidden="true" class="ph-duotone ph-list-checks text-base-content/60 text-2xl"></i>
			<span class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="text-sm font-semibold">{legend}</span>
				<span class="text-base-content/70 text-xs">{hint}</span>
				<span
					class={[
						'mt-1 text-xs font-semibold',
						selectedTitles.length === 0 && 'text-base-content/70'
					]}
				>
					{selectedTitles.join(', ') || noneLabel}
				</span>
			</span>
			<i
				aria-hidden="true"
				class={[
					'ph-duotone ph-caret-down shrink-0 text-xs transition-transform duration-200',
					expanded && 'rotate-180'
				]}
			></i>
		</button>
		{#if expanded}
			<div
				id={panelId}
				class="border-base-content/10 flex flex-col gap-4 border-t p-3 md:p-4"
				transition:slide={{ duration: 200 }}
			>
				{@render questions()}
				{#if selected.length > 0}
					<button
						type="button"
						class="btn btn-ghost btn-sm self-start"
						onclick={() => (selected = [])}
					>
						<i aria-hidden="true" class="ph-duotone ph-x"></i>
						{m.surveyOptionsClear()}
					</button>
				{/if}
			</div>
		{/if}
	</div>
{:else if surveyQuestions.length > 0}
	<fieldset class="fieldset gap-3">
		<legend class="fieldset-legend">{legend}</legend>
		<div class="flex">
			{@render chip({
				label: noneLabel,
				checked: selected.length === 0,
				disabled: selected.length === 0,
				onchange: () => (selected = [])
			})}
		</div>
		{@render questions()}
		<p class="label whitespace-normal">{hint}</p>
	</fieldset>
{/if}
