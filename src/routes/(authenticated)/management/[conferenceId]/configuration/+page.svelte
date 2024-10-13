<script lang="ts">
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import FormInput from '$lib/components/forms/FormInput.svelte';
	import Form from '$lib/components/forms/Form.svelte';
	import { typebox } from 'sveltekit-superforms/adapters';
	import { ConferencePlainInputUpdate } from '$db/generated/schema/Conference';

	let { data } = $props();
	const form = superForm(data.form, {
		validators: typebox(ConferencePlainInputUpdate)
	});
</script>

<ManagementHeader title={m.adminSettings()} fontAwesomeIcon="fa-gears" />
<section class="flex flex-col gap-10 mt-10">
	<div class="card bg-base-200 shadow-sm max-w-lg">
		<div class="card-body">
			<h2 class="card-title">{m.conferenceSettings()}</h2>
			<p class="text-sm mb-4">{@html m.conferenceSettingsDescription()}</p>
			<Form {form}>
				<FormInput fieldLabel={m.conferenceTitle()} fieldName="title" type="text" {form} />
				<!-- <Input
					label={m.conferenceTitle()}
					initialValue={data.conferenceData.title}
					stateValue={getConferenceTitle()}
					changeValue={setConferenceTitle}
				/>
				<Input
					label={m.conferenceLongTitle()}
					initialValue={data.conferenceData.longTitle}
					stateValue={getConferenceLongTitle()}
					changeValue={setConferenceLongTitle}
				/>
				<Input
					label={m.conferenceLocation()}
					initialValue={data.conferenceData.location}
					stateValue={getConferenceLocation()}
					changeValue={setConferenceLocation}
				/>
				<Input
					label={m.conferenceLanguage()}
					initialValue={data.conferenceData.language}
					stateValue={getConferenceLanguage()}
					changeValue={setConferenceLanguage}
				/>
				<Input
					label={m.conferenceWebsite()}
					initialValue={data.conferenceData.website}
					stateValue={getConferenceWebsite()}
					changeValue={setConferenceWebsite}
				/>
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
