<script lang="ts">
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { format } from 'date-fns';
	import DatePicker from './DatePicker.svelte';
	import { onMount } from 'svelte';
	import { conferenceForm } from './conferenceForm.svelte';
	import Input from './Input.svelte';
	import FileInput from './FileInput.svelte';

	let { data } = $props();

	let {
		submit,
		setAllFromConferenceData,
		getConferenceTitle,
		getConferenceLongTitle,
		getConferenceLocation,
		getConferenceLanguage,
		getConferenceWebsite,
		getConferenceStart,
		getConferenceEnd,
		getImage,
		getConferenceStartRegistration,
		getConferenceEndRegistration,

		setConferenceTitle,
		setConferenceLongTitle,
		setConferenceLocation,
		setConferenceLanguage,
		setConferenceWebsite,
		setConferenceStart,
		setConferenceEnd,
		setImage,
		setConferenceStartRegistration,
		setConferenceEndRegistration
	} = conferenceForm();

	onMount(() => {
		setAllFromConferenceData(data.conferenceData);
	});
</script>

<ManagementHeader title={m.adminSettings()} fontAwesomeIcon="fa-gears" />

<pre>
	{JSON.stringify(data.conferenceData, null, 2)}
</pre>

<section class="flex flex-col gap-10 mt-10">
	<div class="card bg-base-200 shadow-sm max-w-lg">
		<div class="card-body">
			<h2 class="card-title mb-4">{m.conferenceSettings()}</h2>
			<form class="flex flex-col gap-4" onsubmit={(e) => submit(e, data.conferenceId)}>
				<Input
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
				<div class="flex flex-col sm:flex-row gap-4 w-full justify-between">
					<DatePicker
						label={m.conferenceStart()}
						initialDate={data.conferenceData.start
							? new Date(data.conferenceData.start)
							: undefined}
						pickedDate={getConferenceStart()}
						setPickedDate={setConferenceStart}
					/>
					<DatePicker
						label={m.conferenceEnd()}
						initialDate={data.conferenceData.end ? new Date(data.conferenceData.end) : undefined}
						pickedDate={getConferenceEnd()}
						setPickedDate={setConferenceEnd}
					/>
				</div>
				<FileInput label={m.conferenceImage()} file={getImage()} changeFile={setImage} />

				<h2 class="card-title mt-10 mb-4">{m.conferenceRegistrationSettings()}</h2>
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
					label={m.conferenceEndRegistration()}
					initialDate={data.conferenceData.endRegistration
						? new Date(data.conferenceData.endRegistration)
						: undefined}
					pickedDate={getConferenceEndRegistration()}
					setPickedDate={setConferenceEndRegistration}
					includeTime
				/>

				<button class="btn btn-primary w-full">{m.save()}</button>
			</form>
		</div>
	</div>
</section>
