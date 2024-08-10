<script lang="ts">
	interface Props {
		label?: string;
		value: string;
		options: { value: string; label: string }[];
		placeholder?: string;
    required?: boolean;
	}

	let { label, value = $bindable(''), options, placeholder, required }: Props = $props();
</script>

<label class="form-control w-full max-w-sm">
	{#if label}
		<div class="label">
			<span class="label-text">{label}</span>
		</div>
	{/if}
	<select
		class="select select-bordered"
    {required}
		onchange={(e) => {
			value = e.target.value;
		}}
	>
		<option disabled selected={!value} value={null}>{placeholder}</option>
		{#each options as option}
			<option value={option.value} selected={option.value === value}>{option.label}</option>
		{/each}
	</select>
</label>
