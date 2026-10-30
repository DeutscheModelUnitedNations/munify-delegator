import { superForm, type FormOptions, type SuperValidated } from 'sveltekit-superforms';
import { toast } from 'svelte-sonner';
import { genericPromiseToastMessages } from '#lib/utils/toast';

/**
 * A superforms SPA form that submits through a mutation, in the shape every such form shares:
 * validated on input, never reset, errors shown as a toast, and `save` called with the data once
 * it is valid. Saving shows the generic progress toast unless `toastProgress` is false (a page
 * that moves on to its own success view).
 */
export function mutationForm<
	T extends Record<string, unknown>,
	M,
	In extends Record<string, unknown> = T
>(
	initial: SuperValidated<T, M, In>,
	validators: NonNullable<FormOptions<T, M, In>['validators']>,
	save: (data: T) => Promise<unknown>,
	{ toastProgress = true }: { toastProgress?: boolean } = {}
) {
	return superForm<T, M, In>(initial, {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators,
		onError: (e) => toast.error(e.result.error.message),
		async onUpdate({ form: validated }) {
			if (!validated.valid) return;
			const promise = save(validated.data);
			if (toastProgress) toast.promise(promise, genericPromiseToastMessages);
			await promise;
		}
	});
}
