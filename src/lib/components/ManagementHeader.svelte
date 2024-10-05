<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	import SettingsButton from './DataTable/SettingsButton.svelte';
	import ProfileButtonHeaderEmbed from './ProfileButton/ProfileButtonHeaderEmbed.svelte';

	interface Props {
		title: string;
		fontAwesomeIcon?: string;
		exportedData?: Record<string, string>[];
		tableOptions?: boolean;
	}
	let { title, fontAwesomeIcon, exportedData, tableOptions = false }: Props = $props();
</script>

<div class="navbar bg-base-200 px-4 py-2 rounded-2xl shadow-lg gap-0 sm:gap-2 no-print">
	<label for="my-drawer" class="btn btn-square btn-ghost drawer-button lg:hidden">
		<i class="fa-solid fa-bars text-xl"></i>
	</label>
	<div class="grow flex gap-2">
		<i
			class="fa-duotone fa-{fontAwesomeIcon
				? fontAwesomeIcon.replace('fa-', '')
				: 'database'} text-2xl hidden sm:block"
		></i>
		<h1 class="lg:text-2xl">{title}</h1>
	</div>
	{#if tableOptions}
		<SettingsButton />
	{/if}
	{#if exportedData}
		<ExportButtons {exportedData} />
	{/if}
	<!-- dropdown -->
	<ProfileButtonHeaderEmbed />
</div>
