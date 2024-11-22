<script lang="ts">
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormFileInput from '$lib/components/Form/FormFile.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import Form from '$lib/components/Form/Form.svelte';
	import { conferenceSettingsFormSchema } from './form-schema';
	import { toast } from '@zerodevx/svelte-toast';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(conferenceSettingsFormSchema),
		onError(e) {
			toast.push(e.result.error.message);
		}
	});
	let formData = $derived(form.form);
</script>

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
		<FormTextInput {form} name="info" placeholder={'Info...'} label={m.infos()} />
		<FormTextInput {form} name="website" placeholder={'mun-sh.de'} label={m.conferenceWebsite()} />
		{#if $formData.image || data.imageDataURL}
			<img
				src={$formData.image ? URL.createObjectURL($formData.image) : data.imageDataURL}
				class="h-64 w-64"
				alt="Preview of the file you selected"
			/>
		{/if}
		<FormFileInput {form} name="image" label={m.conferenceImage()} accept="image/*" />
		<FormDateTimeInput {form} name="startRegistration" label={m.conferenceStartRegistration()} />
		<FormDateTimeInput {form} name="startAssignment" label={m.conferenceStartAssignment()} />
		<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
		<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />
	</Form>
</div>
