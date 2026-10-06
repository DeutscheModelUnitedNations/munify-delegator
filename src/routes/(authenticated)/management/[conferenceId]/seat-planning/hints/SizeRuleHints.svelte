<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { exactSizeWarnings, singleSeatRoles, type Role } from '$lib/services/seatPlanning/hints';

	interface Props {
		roles: Role[];
		roleName: (role: Role) => string;
		maxSuggestions: number;
	}

	let { roles, roleName, maxSuggestions }: Props = $props();

	const sizeWarnings = $derived(exactSizeWarnings(roles));
	const singleSeats = $derived(singleSeatRoles(roles));

	const describe = (candidates: Role[]) =>
		candidates
			.slice(0, maxSuggestions)
			.map((role) => `${roleName(role)} (${role.size})`)
			.join(', ');
</script>

{#each sizeWarnings as { size, count, candidates } (size)}
	<div class="alert alert-warning alert-soft items-start p-3 text-sm">
		<i class="fa-duotone fa-triangle-exclamation mt-0.5"></i>
		<div class="flex flex-col gap-1">
			<p class="font-semibold">{m.seatPlanningSizeRule({ size, count })}</p>
			{#if candidates.length > 0}
				<p>{m.seatPlanningSizeRuleHint()}</p>
				<p>{describe(candidates)}</p>
			{/if}
		</div>
	</div>
{/each}

{#if singleSeats.length > 0}
	<div class="alert alert-warning alert-soft items-start p-3 text-sm">
		<i class="fa-duotone fa-user mt-0.5"></i>
		<div class="flex flex-col gap-1">
			<p class="font-semibold">{m.seatPlanningSingleSeat({ count: singleSeats.length })}</p>
			<p>{m.seatPlanningSingleSeatHint()}</p>
		</div>
	</div>
{/if}
