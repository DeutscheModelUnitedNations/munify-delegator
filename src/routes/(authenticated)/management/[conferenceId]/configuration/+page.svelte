<script lang="ts">
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormFileDataURLInput from '$lib/components/Form/FormFileDataURLInput.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import Form from '$lib/components/Form/Form.svelte';
	import { conferenceSettingsFormSchema } from './form-schema';
	import SuperDebug from 'sveltekit-superforms';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(conferenceSettingsFormSchema)
	});
	let formData = form.form;
</script>
<SuperDebug data={$formData} />
<div class="card-body rounded-2xl bg-base-100 dark:bg-base-200">
	<Form {form}>
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
			placeholder={'New York, USA'}
			label={m.conferenceLocation()}
		/>
		<FormTextInput {form} name="language" placeholder={'Deutsch'} label={m.conferenceLanguage()} />
		<FormTextInput {form} name="website" placeholder={'mun-sh.de'} label={m.conferenceWebsite()} />
		{#if $formData.imageDataUrl}
			<img src={$formData.imageDataUrl} class="h-64" alt="Preview of the file you selected" />
		{/if}
		<!-- <FormFileDataURLInput {form} name="imageDataUrl" label={m.conferenceImage()} accept="image/*" /> -->
		<FormDateTimeInput {form} name="startRegistration" label={m.conferenceStartRegistration()} />
		<FormDateTimeInput {form} name="startAssignment" label={m.conferenceStartAssignment()} />
		<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
		<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />
	</Form>
</div>
