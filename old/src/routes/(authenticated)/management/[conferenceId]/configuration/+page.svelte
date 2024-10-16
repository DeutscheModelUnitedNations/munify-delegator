<script lang="ts">
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import FormTextInput from '$lib/components/forms/FormTextInput.svelte';
	import Form from '$lib/components/forms/Form.svelte';
	import { typebox } from 'sveltekit-superforms/adapters';
	import FormFileDataUrlInput from '$lib/components/forms/FormFileDataURLInput.svelte';
	import { conferenceConfigFormSchema } from './schema';

	let { data } = $props();
	let form = $state(
		superForm(data.form, {
			// validators: typebox(conferenceConfigFormSchema),
			resetForm: false
		})
	);
</script>

<ManagementHeader title={m.adminSettings()} fontAwesomeIcon="fa-gears" />
<section class="mt-10 flex flex-col gap-10">
	<div class="card max-w-lg bg-base-200 shadow-sm">
		<div class="card-body">
			<h2 class="card-title">{m.conferenceSettings()}</h2>
			<p class="mb-4 text-sm">{@html m.conferenceSettingsDescription()}</p>
			<Form {form}>
				<FormTextInput fieldName="title" fieldLabel={m.conferenceTitle()} {form} />
				<FormTextInput fieldName="longTitle" fieldLabel={m.conferenceLongTitle()} {form} />
				<FormTextInput fieldName="location" fieldLabel={m.conferenceLocation()} {form} />
				<FormTextInput fieldName="language" fieldLabel={m.conferenceLanguage()} {form} />
				<FormTextInput fieldName="website" fieldLabel={m.conferenceWebsite()} {form} />
				<!-- <FormFileDataUrlInput fieldName="imageDataUrl" fieldLabel={m.conferenceImage()} {form} /> -->
				<!-- 
				<FileInput label={m.conferenceImage()} file={getImage()} changeFile={setImage} />
				<h2 class="card-title mt-10 mb-4">{m.conferenceTimeSettings()}</h2>
				<DatePicker
					label={m.conferenceStartRegistration()}
					initialDate={data.conferenceData.startRegistration
						? new Date(data.conferenceData.startRegistration)
						: undefined}
					pickedDate={getConferenceStartRegistration()}
					setPickedDate={setConferenceStartRegistration}
					includeTime
				/>
				<DatePicker
					label={m.conferenceStartAssignment()}
					initialDate={data.conferenceData.startAssignment
						? new Date(data.conferenceData.startAssignment)
						: undefined}
					pickedDate={getConferenceEndRegistration()}
					setPickedDate={setConferenceEndRegistration}
					includeTime
				/>
				<DatePicker
					label={m.conferenceStart()}
					initialDate={data.conferenceData.start ? new Date(data.conferenceData.start) : undefined}
					pickedDate={getConferenceStart()}
					setPickedDate={setConferenceStart}
				/>
				<DatePicker
					label={m.conferenceEnd()}
					initialDate={data.conferenceData.end ? new Date(data.conferenceData.end) : undefined}
					pickedDate={getConferenceEnd()}
					setPickedDate={setConferenceEnd}
				/> -->
			</Form>
		</div>
	</div>
</section>
