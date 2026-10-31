import { m } from '#lib/paraglide/messages';
import { toast } from 'svelte-sonner';

export const showError = (error: unknown) =>
	toast.error(error instanceof Error ? error.message : m.genericToastError());

/** Saves one field of a role; a refused change puts the saved value back into the input. */
export async function saveField({
	input,
	saved,
	save
}: {
	input: HTMLInputElement;
	saved: string | number;
	save: () => Promise<unknown>;
}) {
	try {
		await save();
		toast.success(m.saved());
	} catch (error) {
		showError(error);
		input.value = String(saved);
	}
}
