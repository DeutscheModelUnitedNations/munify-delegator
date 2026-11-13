<!--
	@component
	A select that adds what is picked to the audience and goes back to its placeholder, which is
	also its name.
-->
<script lang="ts">
	interface Props {
		label: string;
		options: readonly (readonly [value: string, label: string])[];
		onPick: (value: string) => void;
		testId?: string;
	}

	let { label, options, onPick, testId }: Props = $props();

	function picked(event: Event & { currentTarget: HTMLSelectElement }) {
		const { value } = event.currentTarget;
		event.currentTarget.value = '';
		if (value) onPick(value);
	}
</script>

<select class="select select-sm w-full" aria-label={label} data-testid={testId} onchange={picked}>
	<option value="">{label}</option>
	{#each options as [value, name] (value)}
		<option {value}>{name}</option>
	{/each}
</select>
