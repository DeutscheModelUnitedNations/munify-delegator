<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { isOutsideSizeLimits, type Role } from '$lib/services/seatPlanning/hints';
	import type { SizeLimitsStore } from '../sizeLimits.svelte';

	interface Props {
		roles: Role[];
		sizeLimits: SizeLimitsStore;
		roleName: (role: Role) => string;
	}

	let { roles, sizeLimits, roleName }: Props = $props();

	const outsideLimits = $derived(
		roles.filter((role) => isOutsideSizeLimits(role.size, sizeLimits))
	);

	const parseLimit = (value: string) => (value ? Number(value) : null);
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-2 p-3">
	<h4 class="text-sm font-semibold">{m.seatPlanningSizeLimits()}</h4>
	<div class="flex gap-2">
		<label class="input input-sm">
			<span class="label">{m.seatPlanningMinSize()}</span>
			<input
				type="number"
				min="1"
				value={sizeLimits.min ?? ''}
				onchange={(e) =>
					sizeLimits.set({ min: parseLimit(e.currentTarget.value), max: sizeLimits.max })}
			/>
		</label>
		<label class="input input-sm">
			<span class="label">{m.seatPlanningMaxSize()}</span>
			<input
				type="number"
				min="1"
				value={sizeLimits.max ?? ''}
				onchange={(e) =>
					sizeLimits.set({ min: sizeLimits.min, max: parseLimit(e.currentTarget.value) })}
			/>
		</label>
	</div>
	<p class="text-base-content/60 text-xs">{m.seatPlanningSizeLimitsHint()}</p>
	{#if outsideLimits.length > 0}
		<div class="alert alert-error alert-soft p-2 text-sm">
			<i class="fa-duotone fa-ruler"></i>
			<div>
				<p class="font-semibold">{m.seatPlanningOutsideLimits({ count: outsideLimits.length })}</p>
				<p>{outsideLimits.map((role) => `${roleName(role)} (${role.size})`).join(', ')}</p>
			</div>
		</div>
	{/if}
</section>
