<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateRegionalGroup } from '$lib/utils/enumTranslations';
	import { regionalGroups } from '$lib/helpers/seatPlanning/unMembers';
	import { useSeatPlanningParams } from './filters';

	interface Props {
		/** delegation sizes that currently occur */
		sizes: number[];
	}

	let { sizes }: Props = $props();

	const params = useSeatPlanningParams();
</script>

<div class="flex flex-wrap items-center gap-2">
	<label class="input input-bordered flex grow items-center gap-2">
		<i class="fa-duotone fa-magnifying-glass"></i>
		<input
			type="search"
			placeholder={m.seatPlanningSearch()}
			value={params.q ?? ''}
			oninput={(e) => (params.q = e.currentTarget.value || null)}
		/>
	</label>
	<select
		class="select select-bordered w-auto"
		aria-label={m.countryInfoRegionalGroup()}
		value={params.group ?? ''}
		onchange={(e) => (params.group = e.currentTarget.value || null)}
	>
		<option value="">{m.seatPlanningAllGroups()}</option>
		{#each regionalGroups as group (group)}
			<option value={group}>{translateRegionalGroup(group)}</option>
		{/each}
	</select>
	<select
		class="select select-bordered w-auto"
		aria-label={m.seatPlanningDelegationSize()}
		value={params.size?.toString() ?? ''}
		onchange={(e) => (params.size = e.currentTarget.value ? Number(e.currentTarget.value) : null)}
	>
		<option value="">{m.seatPlanningAnySize()}</option>
		{#each sizes as size (size)}
			<option value={size.toString()}>{m.seatPlanningSizeOption({ size })}</option>
		{/each}
	</select>
	<label class="label cursor-pointer gap-2 text-sm">
		<input
			type="checkbox"
			class="toggle"
			checked={params.noSeat ?? false}
			onchange={(e) => (params.noSeat = e.currentTarget.checked || null)}
		/>
		{m.seatPlanningNoSeatOnly()}
	</label>
</div>
