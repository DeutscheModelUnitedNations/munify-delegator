<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice.js';
	import type { z } from 'zod';
	import Form from './Form.svelte';
	import SchoolPicker from './SchoolPicker.svelte';

	/** Picks another school for a registration and saves it through `save`. */
	interface Props {
		/** The school as it is when the form opens. */
		current: { id: string; name: string } | null | undefined;
		label?: string;
		save: (choice: z.infer<typeof schoolChoiceSchema>) => Promise<unknown>;
		onSaved?: () => void;
	}

	let { current, label, save, onSaved }: Props = $props();

	const initial = untrack(() => current);
	const form = superForm(
		defaults(
			{ schoolId: initial?.id ?? null, schoolName: initial?.name ?? '' },
			zod4Client(schoolChoiceSchema)
		),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(schoolChoiceSchema),
			onError: (e) => toast.error(e.result.error.message),
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = save(validated.data);
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				onSaved?.();
			}
		}
	);
</script>

<Form {form} requireTaintedToSubmit={false}>
	<SchoolPicker {form} name="schoolName" idName="schoolId" {label} />
</Form>
