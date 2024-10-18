<!-- <script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';

	interface Props {
		fieldName: string;
		fieldLabel: string;
		form: SuperForm<A, B>;
		accept?: string;
		maxSizeMb?: number;
	}

	let { form, fieldLabel, fieldName, accept, maxSizeMb }: Props = $props();
	let { form: formData, constraints, errors } = form;
</script>

<label for={fieldName} class="form-control w-full">
	<span class="label-text">{fieldLabel}</span>
	<input
		type="file"
		class="file-input file-input-bordered"
		{accept}
		multiple={false}
		onchange={(e) => {
			const reader = new FileReader();
			const input = e.target as HTMLInputElement;
			if (!input?.files?.[0]) return;
			//TOOD this should be in the live form validation?
			//TODO i18n
			if (maxSizeMb && (input?.files?.[0].size ?? 0) > maxSizeMb * 1000 * 1000) {
				alert(`File size must be less than ${maxSizeMb}MB (${input?.files?.[0].size} bytes)`);
				return;
			}
			reader.onload = (e) => {
				const result = e.target?.result;
				(formData as any)[fieldName].set(result as string);
			};
			reader.readAsDataURL(input?.files?.[0]);
		}}
		name={fieldName}
		aria-invalid={($errors as any)[fieldName] ? 'true' : undefined}
		{...($constraints as any)[fieldName]}
	/>
	{#if ($errors as any)[fieldName]}<span class="text-error">{($errors as any)[fieldName]}</span
		>{/if}
</label> -->

<!-- {initialValue !== stateValue && 'input-success border-4'} -->
