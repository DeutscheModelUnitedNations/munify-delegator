<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice';
	import type { z } from 'zod';
	import Form from './Form.svelte';
	import SchoolPicker from './SchoolPicker.svelte';
	import { mutationForm } from './mutationForm';

	/** Picks another school for a registration and saves it through `save`. */
	interface Props {
		/** The school as it is when the form opens. */
		current: { id: string; name: string } | null | undefined;
		label?: string;
		save: (choice: z.infer<typeof schoolChoiceSchema>) => Promise<unknown>;
		onSaved?: () => void;
		/** Keeps the submit button disabled until the school was changed. */
		requireTaintedToSubmit?: boolean;
	}

	let { current, label, save, onSaved, requireTaintedToSubmit = false }: Props = $props();

	const initial = untrack(() => current);
	const form = mutationForm({
		initial: defaults(
			{ schoolId: initial?.id ?? null, schoolName: initial?.name ?? '' },
			zod4Client(schoolChoiceSchema)
		),
		validators: zod4Client(schoolChoiceSchema),
		save: async (choice) => {
			await save(choice);
			onSaved?.();
		}
	});
</script>

<Form {form} {requireTaintedToSubmit}>
	<SchoolPicker {form} name="schoolName" idName="schoolId" {label} />
</Form>
