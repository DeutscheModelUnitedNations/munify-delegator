<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<div class="alert alert-info mb-6">
	<i class="fas fa-circle-info"></i>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<span>{@html m.tabExplanationLinks()}</span>
</div>

<FormFieldset title={m.links()}>
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
</FormFieldset>
