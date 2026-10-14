<script lang="ts">
	interface Props {
		label: string;
		selected?: boolean;
		disabled?: boolean;
		changeSelection?: (selected: boolean) => void;
	}

	let { label, selected = $bindable(false), disabled = false, changeSelection }: Props = $props();
</script>

<label class="label cursor-pointer">
	<input
		type="checkbox"
		checked={selected}
		class="checkbox"
		{disabled}
		onclick={changeSelection ? () => changeSelection(!selected) : undefined}
	/>
	{label}
</label>
