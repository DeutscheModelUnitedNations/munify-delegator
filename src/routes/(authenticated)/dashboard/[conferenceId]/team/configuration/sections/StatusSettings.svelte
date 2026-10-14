<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormSection from '$lib/components/form/FormSection.svelte';
	import type { ConferenceSettings } from '../form-schema';
	import { conferenceStateIcon } from '../../../../conferenceGroups';

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

<FormSection title={m.features()} icon="toggle-on">
	<div class="flex flex-col gap-3">
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="unlockPayments"
				bind:checked={$formData.unlockPayments}
			/>
			<span>{m.paymentOpen()}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="unlockPostals"
				bind:checked={$formData.unlockPostals}
			/>
			<span>{m.postalOpen()}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="isOpenPaperSubmission"
				bind:checked={$formData.isOpenPaperSubmission}
			/>
			<span>{m.paperSubmissionOpen()}</span>
		</label>
		<label class="flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				class="toggle toggle-primary"
				name="showCalendar"
				bind:checked={$formData.showCalendar}
			/>
			<span>{m.showCalendar()}</span>
		</label>
	</div>
</FormSection>

<FormSection title={m.conferenceStatus()} icon="signal">
	<div class="flex flex-col gap-3">
		{#each conferenceStateOptions as option (option.value)}
			<label
				class="border-base-300 hover:bg-base-200 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors {$formData.state ===
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
					<span class="font-medium">
						<i class="{conferenceStateIcon(option.value)} mr-1"></i>
						{option.label}
					</span>
					<span class="text-sm opacity-70">{option.description}</span>
				</div>
			</label>
		{/each}
	</div>
</FormSection>
