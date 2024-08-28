<script lang="ts">
	interface Props {
		label?: string;
		icon?: string;
		value: string;
		defaultValue?: string;
		placeholder?: string;
		pattern?: string;
		required?: boolean;
		type?: string;
		max?: string;
	}

	let {
		label,
		icon,
		value = $bindable(''),
		defaultValue = '',
		placeholder,
		pattern,
		required,
		type,
		max
	}: Props = $props();
</script>

<label class="form-control w-full max-w-sm">
	{#if label}
		<div class="label">
			<span class="label-text">{label}</span>
		</div>
	{/if}
	<label class="input input-bordered flex items-center gap-2">
		<input
			type={type ? type : 'text'}
			class="grow"
			value={value == '' ? defaultValue : value}
			{pattern}
			{placeholder}
			{required}
      {max}
			oninput={(e) => {
				value = e.target.value;
			}}
		/>
		{#if icon}
			<i class="fa-duotone fa-{icon}"></i>
		{/if}
	</label>
</label>
