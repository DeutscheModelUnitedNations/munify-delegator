<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { slide } from 'svelte/transition';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import SurveyOptionPicker from '#lib/components/survey/SurveyOptionPicker.svelte';
	import type { ServerMode } from './attendanceSession';
	import { modeHints, modeIcons, modeLabels } from './sessionModes';

	/** Sets a new scanner session up: its name, what a scan does in it, the survey choice it expects. */
	interface Props {
		conferenceId: string;
		occasion: string;
		mode: ServerMode;
		surveyOptionIds: string[];
		onStart: () => void;
	}

	let {
		conferenceId,
		occasion = $bindable(),
		mode = $bindable(),
		surveyOptionIds = $bindable(),
		onStart
	}: Props = $props();

	const MODES: ServerMode[] = ['CHECK', 'RECORD', 'BADGE'];
	const uid = $props.id();

	/** The form unfolds on request, and its name is what comes first. */
	const focusField = (field: HTMLInputElement) => field.focus({ preventScroll: true });
</script>

<form
	class="bg-base-200 flex flex-col gap-5 rounded-box p-4 md:p-6"
	aria-label={m.scanNewSession()}
	transition:slide={{ duration: 200 }}
	onsubmit={(event) => {
		event.preventDefault();
		onStart();
	}}
>
	<FormFieldset title={m.sessionOccasion()} plain>
		<input
			class="input w-full max-w-xl"
			type="text"
			bind:value={occasion}
			aria-label={m.sessionOccasion()}
			placeholder={m.sessionOccasionPlaceholder()}
			autocomplete="off"
			{@attach focusField}
		/>
	</FormFieldset>

	<!-- What a scan does, every kind explained, so they can be compared before choosing -->
	<FormFieldset title={m.scanSessionType()} plain>
		<div class="grid gap-2 md:grid-cols-3 md:gap-3">
			{#each MODES as option (option)}
				<label
					class={[
						'rounded-box has-focus-visible:outline-base-content flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors has-focus-visible:outline-2',
						mode === option
							? 'border-primary bg-primary/10'
							: 'border-base-content/10 hover:border-base-content/30'
					]}
				>
					<i
						aria-hidden="true"
						class={[
							modeIcons[option],
							'mt-0.5 text-2xl',
							mode === option ? 'ph-fill text-primary' : 'ph-duotone text-base-content/60'
						]}
					></i>
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="text-sm font-semibold">{modeLabels[option]()}</span>
						<span class="text-base-content/70 text-xs">{modeHints[option]()}</span>
					</span>
					<input
						type="radio"
						class="radio radio-primary radio-sm"
						name="{uid}-mode"
						value={option}
						bind:group={mode}
					/>
				</label>
			{/each}
		</div>
	</FormFieldset>

	{#if mode !== 'RECORD'}
		<div transition:slide={{ duration: 200 }}>
			<SurveyOptionPicker
				{conferenceId}
				bind:selected={surveyOptionIds}
				collapsible
				legend={m.sessionSurveyOptions()}
				noneLabel={m.sessionSurveyOptionsNone()}
				hint={m.sessionSurveyOptionsHint()}
			/>
		</div>
	{/if}

	<button class="btn btn-primary sm:self-end" type="submit" disabled={!occasion.trim()}>
		<i aria-hidden="true" class="ph-duotone ph-play"></i>
		{m.startSession()}
	</button>
</form>
