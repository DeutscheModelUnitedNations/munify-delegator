<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { isOutsideSizeLimits, type SizeLimits } from '$lib/helpers/seatPlanning/hints';

	interface Props {
		size: number;
		sizeLimits: SizeLimits;
		/** members of the delegation assigned to the role, if any */
		members: number | undefined;
	}

	let { size, sizeLimits, members }: Props = $props();

	const badgeClass = $derived.by(() => {
		if (isOutsideSizeLimits(size, sizeLimits)) return 'badge-error';
		return size === 1 ? 'badge-warning' : 'badge-ghost';
	});
</script>

{#if size === 0}
	<span class="text-base-content/40">–</span>
{:else}
	<span class="badge badge-sm {badgeClass}">{size}</span>
{/if}
{#if members !== undefined && members > size}
	<span class="tooltip tooltip-left" data-tip={m.seatPlanningOverfilled({ members, seats: size })}>
		<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error"></i>
	</span>
{/if}
