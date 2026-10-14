<script lang="ts">
	import ConferenceSettingsEditor from './ConferenceSettingsEditor.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<!-- The editor seeds its form once, so a different conference gets a fresh one. -->
{#key params.conferenceId}
	<ConferenceSettingsEditor conferenceId={params.conferenceId} />
{/key}
