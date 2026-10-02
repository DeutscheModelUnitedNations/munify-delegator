<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import dayjs from 'dayjs';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormFileInput from '$lib/components/form/FormFile.svelte';
	import FormDateTimeInput from '$lib/components/form/FormDateTimeInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	interface Props {
		form: SuperForm<ConferenceSettings>;
		/** The images as currently stored, previewed until a new file is picked. */
		storedImages: {
			imageDataURL: string | null;
			emblemDataURL: string | null;
			logoDataURL: string | null;
		};
	}

	let { form, storedImages }: Props = $props();
	let formData = $derived(form.form);

	const technicalRegistrationDeadline = $derived(
		dayjs($formData.startAssignment)
			.add($formData.registrationDeadlineGracePeriodMinutes, 'minute')
			.toDate()
	);
</script>

<div class="alert alert-info mb-6">
	<i class="fas fa-circle-info"></i>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<span>{@html m.tabExplanationGeneral()}</span>
</div>

<FormFieldset title={m.general()}>
	<FormTextInput
		{form}
		name="title"
		placeholder={`MUN-SH ${new Date().getFullYear() + 1}`}
		label={m.conferenceTitle()}
	/>
	<FormTextInput
		{form}
		name="longTitle"
		placeholder={`Model United Nation Schleswig-Holstein ${new Date().getFullYear() + 1}`}
		label={m.conferenceLongTitle()}
	/>
	<FormTextInput
		{form}
		name="location"
		placeholder="New York, USA"
		label={m.conferenceLocation()}
	/>
	<FormTextInput {form} name="language" placeholder="Deutsch" label={m.conferenceLanguage()} />
	<FormTextInput {form} name="website" placeholder="mun-sh.de" label={m.conferenceWebsite()} />
	{#if $formData.image || storedImages.imageDataURL}
		<img
			src={$formData.image ? URL.createObjectURL($formData.image) : storedImages.imageDataURL}
			class="h-64 w-64"
			alt="Preview of the file you selected"
		/>
	{/if}
	<FormFileInput {form} name="image" label={m.conferenceImage()} accept="image/*" />
	<div class="mt-4">
		<p class="text-sm opacity-70 mb-2">{m.conferenceEmblem()}</p>
		{#if $formData.emblem || storedImages.emblemDataURL}
			<img
				src={$formData.emblem ? URL.createObjectURL($formData.emblem) : storedImages.emblemDataURL}
				class="h-24 w-24 mb-2"
				alt="Emblem preview"
			/>
		{/if}
		<FormFileInput {form} name="emblem" label={m.conferenceEmblem()} accept="image/svg+xml" />
		<p class="text-xs opacity-50 mt-1">{m.conferenceEmblemHint()}</p>
	</div>
	<div class="mt-4">
		<p class="text-sm opacity-70 mb-2">{m.conferenceLogo()}</p>
		{#if $formData.logo || storedImages.logoDataURL}
			<img
				src={$formData.logo ? URL.createObjectURL($formData.logo) : storedImages.logoDataURL}
				class="h-24 w-24 mb-2"
				alt="Logo preview"
			/>
		{/if}
		<FormFileInput {form} name="logo" label={m.conferenceLogo()} accept="image/*" />
		<p class="text-xs opacity-50 mt-1">{m.conferenceLogoHint()}</p>
	</div>
	<FormDateTimeInput
		{form}
		name="startAssignment"
		label={m.conferenceStartAssignment()}
		enableTime
	/>
	<FormTextInput
		{form}
		name="registrationDeadlineGracePeriodMinutes"
		label={m.registrationDeadlineGracePeriod()}
	/>
	<p class="test-sm mb-2 opacity-50">
		{m.technicalRegistrationDeadline()}: {technicalRegistrationDeadline.toLocaleString()}
	</p>
	<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
	<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.conferenceTimezone()}</legend>
		<input
			type="text"
			class="input w-full"
			name="timezone"
			list="timezone-list"
			bind:value={$formData.timezone}
			placeholder="Europe/Berlin"
		/>
		<datalist id="timezone-list">
			{#each Intl.supportedValuesOf('timeZone') as tz (tz)}
				<option value={tz}></option>
			{/each}
		</datalist>
		<p class="text-base-content/50 mt-1 text-xs">{m.conferenceTimezoneHint()}</p>
	</fieldset>
</FormFieldset>
