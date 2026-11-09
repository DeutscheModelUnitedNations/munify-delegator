<script lang="ts">
	import type { Snippet } from 'svelte';
	import AuthenticatedHeader from './AuthenticatedHeader.svelte';
	import UserCardDrawer from '#lib/components/userCard/UserCardDrawer.svelte';

	// import ExportButtons from '#lib/components/dataTable/ExportButtons.svelte';
	// import SettingsButton from './DataTable/SettingsButton.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex h-full w-full flex-col">
	<AuthenticatedHeader />
	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto flex h-full w-full max-w-[1800px] px-4 pt-4 md:px-8"
	>
		{@render children()}
	</main>
</div>

<UserCardDrawer />
