<script lang="ts" generics="V extends string | null">
	import { m } from '$lib/paraglide/messages';

	/** Picks the day something is moved or copied to. */
	interface Props {
		days: { id: string; name: string; date: Date | string }[];
		value: V;
	}

	let { days, value = $bindable() }: Props = $props();
</script>

<fieldset class="fieldset">
	<legend class="fieldset-legend">{m.calendarTargetDay()}</legend>
	<select class="select w-full" bind:value>
		{#each days as day (day.id)}
			<option value={day.id}>{day.name} – {new Date(day.date).toLocaleDateString()}</option>
		{/each}
	</select>
</fieldset>
