<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label: string;
		form: SuperForm<A, B>;
		accept?: string;
		maxSizeMb?: number;
	}

	let { form, label, name, accept, maxSizeMb }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);

	const changed = async (e) => {
		const reader = new FileReader();
		const input = e.target as HTMLInputElement;
		const selectedFile = input?.files?.[0];
		if (!selectedFile) throw new Error('No file selected');
		if (maxSizeMb && (input?.files?.[0].size ?? 0) > maxSizeMb * 1000 * 1000) {
			throw new Error(
				`File size must be less than ${maxSizeMb}MB (${input?.files?.[0].size} bytes)`
			);
		}
		const readerResultPromise = new Promise((resolve) => {
			reader.onload = (e) => {
				const result = e.target?.result;
				if (!result) throw new Error('No file converted');
				resolve(result as string);
			};
		});
		reader.readAsDataURL(selectedFile);
		const readerResult = await readerResultPromise;

		// @ts-ignore
		$formData[name] = readerResult;
	};
</script>

<label for={name} class="form-control w-full">
	<span class="label-text">{label}</span>
	<input
		type="file"
		class="file-input file-input-bordered"
		multiple={false}
		onchange={changed}
		{accept}
		{name}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	/>
	<FormFieldErrors {errors} />
</label>
