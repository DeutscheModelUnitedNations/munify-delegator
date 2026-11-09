<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';
	import InfoGrid from '#lib/components/infoGrid/index';
	import { m } from '#lib/paraglide/messages';

	/** The roles applied for, one `role` each, or a dash when there are none. */
	interface Props {
		icon: string;
		applications: T[];
		role: Snippet<[T]>;
	}

	let { icon, applications, role }: Props = $props();
</script>

<InfoGrid.Entry title={m.roleApplications()} {icon}>
	{#if applications.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each applications as application (application.id)}
				{@render role(application)}
			{/each}
		</div>
	{:else}
		<i class="ph-duotone ph-minus"></i>
	{/if}
</InfoGrid.Entry>
