<script lang="ts">
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/services/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Delegation } from './appData.svelte';
	import { getWeights } from './weights.svelte';

	interface Props {
		application: Delegation;
	}

	let { application }: Props = $props();

	let optionsOpen = $state(false);

	let gotWishNation = $derived(() => {
		if (!application.assignedNation) return false;
		return application.appliedForRoles
			.map((x) => x.nation?.alpha3Code)
			.includes(application.assignedNation?.alpha3Code);
	});

	let gotWishNSA = $derived(() => {
		if (!application.assignedNSA) return false;
		return application.appliedForRoles
			.map((x) => x.nonStateActor?.id)
			.includes(application.assignedNSA?.id);
	});

	let gotWish = $derived(() => {
		if (!application.assignedNation && !application.assignedNSA) return true;
		return gotWishNation() || gotWishNSA();
	});
</script>

<div
	role="none"
	class="flex grow-0 flex-col items-center gap-1 rounded-md p-2 {application.flagged
		? 'bg-warning'
		: application.note
			? `bg-info`
			: 'bg-base-300'} {!gotWish() ? 'shadow-md shadow-red-500' : 'shadow'}"
>
	<p class="text-xs font-bold">
		{codenamize(application.id)}
	</p>
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
			data-tip={application.appliedForRoles
				.map((x) =>
					x.nation?.alpha3Code
						? getFullTranslatedCountryNameFromISO3Code(x.nation?.alpha3Code ?? '')
						: x.nonStateActor?.abbreviation
				)
				.join(', ')}
		>
			<i class="fas fa-flag"></i>
		</div>
		<div
			class="tooltip"
			data-tip={application.members
				.map((x) => `${x.user.given_name} ${x.user.family_name}`)
				.join(',')}
		>
			<i class="fas fa-users"></i>
		</div>
		{#if application.supervisors?.length > 0}
			<div
				class="tooltip"
				data-tip={application.supervisors
					.map((x) => `${x.user.given_name} ${x.user.family_name}`)
					.join(', ')}
			>
				<i class="fas fa-chalkboard-user"></i>
			</div>
		{/if}
		{#if application.splittedFrom}
			<div class="tooltip" data-tip={`Zerteilt von ${codenamize(application.splittedFrom)}`}>
				<i class="fas fa-split"></i>
			</div>
		{/if}
	</div>
</div>

<dialog class="modal {optionsOpen && 'modal-open'}">
	<div class="modal-box"></div>
</dialog>
