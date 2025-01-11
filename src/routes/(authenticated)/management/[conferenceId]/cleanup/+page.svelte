<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Section from './Section.svelte';


</script>

<div class="flex w-full flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.cleanup()}</h2>
		<p>{@html m.cleanupDescription()}</p>
	</div>
	<Section
		title="Delegationsmitglieder"
		description="Delegationsmitglieder ohne Rolle löschen"
		btnText="Delegationsmitglieder löschen"
		action={async () => {}}
	/>
	<Section
		title="Einzelteilnehmer"
		description="Einzelteilnehmer ohne Rolle löschen"
		btnText="Einzelteilnehmer löschen"
		action={async () => {}}
	/>
	<Section
		title="Delegationen"
		description="Delegationen ohne Mitglieder löschen"
		btnText="Delegationen löschen"
		action={async () => {}}
	/>
</div>
