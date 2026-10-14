<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormSection from '$lib/components/form/FormSection.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<FormSection title={m.links()} icon="link">
	<FormTextInput
		{form}
		name="linkToPreparationGuide"
		placeholder="https://path-to-your-guide.com"
		label={m.preparationGuide()}
	/>
	<FormTextInput
		{form}
		name="linkToTeamWiki"
		placeholder="https://wiki.example.com"
		label={m.linkToTeamWiki()}
	/>
	<FormTextInput
		{form}
		name="linkToServicesPage"
		placeholder="https://services.example.com"
		label={m.linkToServicesPage()}
	/>
</FormSection>
