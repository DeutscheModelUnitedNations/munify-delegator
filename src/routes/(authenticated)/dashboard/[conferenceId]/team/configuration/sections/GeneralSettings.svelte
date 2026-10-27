<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { CONFERENCE_LANGUAGES, conferenceLanguageName } from '#lib/helpers/conferenceLanguage.js';
	import type { SuperForm } from 'sveltekit-superforms';
	import { technicalRegistrationDeadline } from '#lib/helpers/applicationReadiness.js';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import FormSelect from '#lib/components/form/FormSelect.svelte';
	import FormImage from '#lib/components/form/FormImage.svelte';
	import FormDateTimeInput from '#lib/components/form/FormDateTimeInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	interface Props {
		form: SuperForm<ConferenceSettings>;
		/** The images as currently stored, previewed until a new file is picked. */
		storedImages: {
			imageFile: { url: string } | null;
			emblemFile: { url: string } | null;
			logoFile: { url: string } | null;
		};
	}

	let { form, storedImages }: Props = $props();

	const languageOptions = CONFERENCE_LANGUAGES.map((language) => ({
		value: language,
		label: conferenceLanguageName(language, getLocale())
	})).sort((a, b) => a.label.localeCompare(b.label, getLocale()));
	let formData = $derived(form.form);

	const technicalDeadline = $derived(
		technicalRegistrationDeadline({
			startAssignment: $formData.startAssignment,
			registrationDeadlineGracePeriodMinutes: $formData.registrationDeadlineGracePeriodMinutes
		})
	);
</script>

<FormSection title={m.conferenceBasics()} icon="gear">
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
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
		<FormTextInput
			{form}
			name="location"
			placeholder="New York, USA"
			label={m.conferenceLocation()}
		/>
		<FormSelect
			{form}
			name="language"
			label={m.conferenceLanguage()}
			description={m.conferenceLanguageHint()}
			options={languageOptions}
		/>
	</div>
	<FormTextInput {form} name="website" placeholder="mun-sh.de" label={m.conferenceWebsite()} />
</FormSection>

<FormSection title={m.conferenceImagery()} icon="images">
	<FormImage
		{form}
		name="image"
		label={m.conferenceImage()}
		storedUrl={storedImages.imageFile?.url ?? null}
	/>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<FormImage
			{form}
			name="emblem"
			label={m.conferenceEmblem()}
			description={m.conferenceEmblemHint()}
			accept="image/svg+xml"
			storedUrl={storedImages.emblemFile?.url ?? null}
		/>
		<FormImage
			{form}
			name="logo"
			label={m.conferenceLogo()}
			description={m.conferenceLogoHint()}
			storedUrl={storedImages.logoFile?.url ?? null}
		/>
	</div>
</FormSection>

<FormSection title={m.conferenceSchedule()} icon="calendar-days">
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
		<FormDateTimeInput
			{form}
			name="startAssignment"
			label={m.conferenceStartAssignment()}
			enableTime
		/>
		<div class="flex flex-col">
			<FormTextInput
				{form}
				name="registrationDeadlineGracePeriodMinutes"
				label={m.registrationDeadlineGracePeriod()}
			/>
			<p class="text-base-content/60 mt-1 text-xs">
				{m.technicalRegistrationDeadline()}: {technicalDeadline.toLocaleString(getLocale())}
			</p>
		</div>
		<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
		<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />
	</div>
	<fieldset class="fieldset">
		<legend class="label mb-2">{m.conferenceTimezone()}</legend>
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
</FormSection>
