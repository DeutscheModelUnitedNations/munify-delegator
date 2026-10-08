<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** How many of a supervisor's students were given a role, out of all they registered. */
	interface Props {
		accepted: number;
		total: number;
	}

	let { accepted, total }: Props = $props();

	const allAccepted = $derived(total > 0 && accepted === total);
</script>

<div class="stats bg-base-200 shadow">
	<div class="stat">
		<div class="stat-figure text-primary">
			<i
				class="fa-sharp-duotone fa-solid text-4xl"
				class:fa-circle-check={allAccepted}
				class:text-success={allAccepted}
				class:fa-users={!allAccepted}
			></i>
		</div>
		<div class="stat-title">{m.studentsAccepted()}</div>
		<div class="stat-value">{accepted} / {total}</div>
		{#if allAccepted}
			<div class="stat-desc text-success">{m.allStudentsAcceptedMessage()}</div>
		{/if}
	</div>
</div>
