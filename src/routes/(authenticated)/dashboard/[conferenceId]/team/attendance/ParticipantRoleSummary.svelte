<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { Snippet } from 'svelte';
	import type { FoundPerson } from './scanLoad';

	interface Props {
		roles: FoundPerson['roles'];
		/** Rendered between the flag and the role badges, e.g. the person's name. */
		children: Snippet;
	}

	let { roles, children }: Props = $props();
</script>

<div class="flex items-start gap-4">
	{#if roles.nationAlpha2Code}
		<Flag alpha2Code={roles.nationAlpha2Code} size="sm" />
	{:else if roles.nonStateActorName}
		<Flag nsa icon={roles.nonStateActorIcon} size="sm" />
	{/if}

	<div class="flex flex-1 flex-col gap-2">
		{@render children()}

		<div class="mt-1 flex flex-wrap gap-2">
			{#if roles.committeeAbbreviation}
				<span class="badge badge-soft badge-primary">{roles.committeeAbbreviation}</span>
			{/if}
			{#if roles.nationAlpha3Code}
				<span class="badge badge-soft badge-secondary">
					{getFullTranslatedCountryNameFromISO3Code(roles.nationAlpha3Code)}
				</span>
			{/if}
			{#if roles.nonStateActorName}
				<span class="badge badge-soft badge-secondary">{roles.nonStateActorName}</span>
			{/if}
			{#if roles.singleRoleName}
				<span class="badge badge-soft badge-accent">{roles.singleRoleName}</span>
			{/if}
			{#if roles.isHeadDelegate}
				<span class="badge badge-soft badge-info">{m.headDelegate()}</span>
			{/if}
			{#if roles.isSupervisor}
				<span class="badge badge-soft badge-warning">{m.supervisor()}</span>
			{/if}
		</div>
	</div>
</div>
