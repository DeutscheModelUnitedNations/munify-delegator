<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import type { ConferenceSettings } from '../form-schema';

	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
	let formData = $derived(form.form);

	const conferenceStateOptions: {
		label: string;
		value: ConferenceSettings['state'];
		description: string;
	}[] = [
		{
			label: m.conferenceStatusPre(),
			value: 'PRE',
			description: m.conferenceStatusPreDescription()
		},
		{
			label: m.conferenceStatusParticipantRegistration(),
			value: 'PARTICIPANT_REGISTRATION',
			description: m.conferenceStatusParticipantRegistrationDescription()
		},
		{
			label: m.conferenceStatusPreparation(),
			value: 'PREPARATION',
			description: m.conferenceStatusPreparationDescription()
		},
		{
			label: m.conferenceStatusActive(),
			value: 'ACTIVE',
			description: m.conferenceStatusActiveDescription()
		},
		{
			label: m.conferenceStatusPost(),
			value: 'POST',
			description: m.conferenceStatusPostDescription()
		}
	];
</script>

<div class="alert alert-info mb-6">
	<i class="fas fa-circle-info"></i>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<span>{@html m.tabExplanationStatus()}</span>
</div>

<FormFieldset title={m.features()}>
	<div class="flex flex-col gap-3">
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="unlockPayments"
				bind:checked={$formData.unlockPayments}
			/>
			<span class="label-text">{m.paymentOpen()}</span>
		</label>
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="unlockPostals"
				bind:checked={$formData.unlockPostals}
			/>
			<span class="label-text">{m.postalOpen()}</span>
		</label>
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="isOpenPaperSubmission"
				bind:checked={$formData.isOpenPaperSubmission}
			/>
			<span class="label-text">{m.paperSubmissionOpen()}</span>
		</label>
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="showCalendar"
				bind:checked={$formData.showCalendar}
			/>
			<span class="label-text">{m.showCalendar()}</span>
		</label>
	</div>
</FormFieldset>

<FormFieldset title={m.conferenceStatus()}>
	<div class="flex flex-col gap-3">
		{#each conferenceStateOptions as option (option.value)}
			<label
				class="flex items-start gap-3 p-3 rounded-lg border border-base-300 cursor-pointer hover:bg-base-200 transition-colors {$formData.state ===
				option.value
					? 'border-primary bg-primary/5'
					: ''}"
			>
				<input
					type="radio"
					name="state"
					value={option.value}
					class="radio radio-primary mt-0.5"
					checked={$formData.state === option.value}
					onchange={() => ($formData.state = option.value)}
				/>
				<div class="flex flex-col gap-1">
					<span class="font-medium">{option.label}</span>
					<span class="text-sm opacity-70">{option.description}</span>
				</div>
			</label>
		{/each}
	</div>
</FormFieldset>
