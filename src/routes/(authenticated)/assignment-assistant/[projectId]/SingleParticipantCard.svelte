<script lang="ts">
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/services/codenamize';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { SingleParticipant } from './appData.svelte';
	import { getWeights } from './weights.svelte';

	interface Props {
		application: SingleParticipant;
	}

	let { application }: Props = $props();
</script>

<div
	role="none"
	class="flex grow-0 flex-col items-center gap-1 rounded-md p-2 {application.flagged
		? 'bg-warning'
		: application.note
			? `bg-info`
			: 'bg-base-300'} shadow"
>
	<p class="text-xs font-bold">
		{codenamize(application.id)}
	</p>
	<div class="flex items-center justify-center gap-2 text-base">
		{#each application.appliedForRoles as role}
			<div class="tooltip" data-tip={role.name}>
				<i class="fas fa-{role.fontAwesomeIcon?.replace('fa-', '')}"></i>
			</div>
		{/each}
	</div>
	<StarRating rating={application.evaluation ?? getWeights().nullRating} size="xs" />
	<div class="flex items-center justify-center gap-2 text-xs">
		{#if application.note}
			<div class="tooltip" data-tip={application.note}>
				<i class="fas fa-sticky-note"></i>
			</div>
		{/if}
		<div class="tooltip" data-tip={application.id}>
			<i class="fas fa-barcode-scan"></i>
		</div>
		<div class="tooltip" data-tip={application.school}>
			<i class="fas fa-school"></i>
		</div>
		<div
			class="tooltip"
			data-tip={formatNames(application.user.given_name, application.user.family_name)}
		>
			<i class="fas fa-user-tie"></i>
		</div>
	</div>
</div>
