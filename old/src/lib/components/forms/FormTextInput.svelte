<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';

	interface Props {
		fieldName: string;
		fieldLabel: string;
		form: SuperForm<A, B>;
	}

	let { form, fieldLabel, fieldName }: Props = $props();
	let { form: formData, constraints, errors } = form;

</script>

<label for={fieldName} class="form-control w-full">
	<span class="label-text">{fieldLabel}</span>
	<input
		type="text"
		class="input input-bordered"
		bind:value={$formData[fieldName]}
		name={fieldName}
		aria-invalid={($errors as any)[fieldName] ? 'true' : undefined}
		{...($constraints as any)[fieldName]}
	/>
	{#if ($errors as any)[fieldName]}<span class="text-error">{($errors as any)[fieldName]}</span
		>{/if}
</label>

<!-- {initialValue !== stateValue && 'input-success border-4'} -->
