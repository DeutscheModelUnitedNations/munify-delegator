<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	/** The conference's age range, which the entry flows warn with and the plausibility page checks. */
	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<FormSection title={m.conferenceAgeRange()} icon="cake">
	<p class="text-base-content/70 text-sm">{m.conferenceAgeRangeDescription()}</p>
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
		<FormTextInput
			{form}
			name="participantMinAge"
			type="number"
			label={m.conferenceParticipantMinAge()}
		/>
		<FormTextInput
			{form}
			name="participantMaxAge"
			type="number"
			label={m.conferenceParticipantMaxAge()}
		/>
		<FormTextInput
			{form}
			name="supervisorMinAge"
			type="number"
			label={m.conferenceSupervisorMinAge()}
		/>
	</div>
</FormSection>
