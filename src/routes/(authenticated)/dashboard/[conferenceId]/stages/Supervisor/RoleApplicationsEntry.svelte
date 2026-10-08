<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';
	import InfoGrid from '$lib/components/infoGrid';
	import { m } from '$lib/paraglide/messages';

	/** The roles applied for, one `role` each, or a dash when there are none. */
	interface Props {
		fontAwesomeIcon: string;
		applications: T[];
		role: Snippet<[T]>;
	}

	let { fontAwesomeIcon, applications, role }: Props = $props();
</script>

<InfoGrid.Entry title={m.roleApplications()} {fontAwesomeIcon}>
	{#if applications.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each applications as application (application.id)}
				{@render role(application)}
			{/each}
		</div>
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-dash"></i>
	{/if}
</InfoGrid.Entry>
