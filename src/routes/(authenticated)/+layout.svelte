<script lang="ts">
	import { configPublic } from '$config/public';
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import AuthenticatedHeader from './AuthenticatedHeader.svelte';

	// import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	// import SettingsButton from './DataTable/SettingsButton.svelte';
</script>

<div class="flex h-full w-full flex-col">
	<AuthenticatedHeader />
	<div class="flex h-full w-full">
		<slot />
	</div>
</div>
