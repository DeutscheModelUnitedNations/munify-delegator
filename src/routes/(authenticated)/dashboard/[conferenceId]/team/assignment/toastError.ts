import { m } from '$lib/paraglide/messages';
import { toast } from 'svelte-sonner';

/** Shows why a draft mutation failed: the server's message, or the generic one. */
export function toastError(error: unknown) {
	toast.error(error instanceof Error ? error.message : m.genericToastError());
}

/** Whether a draft mutation worked; a failure is shown with `toastError`. */
export function succeeded(mutation: PromiseLike<unknown>) {
	return Promise.resolve(mutation).then(
		() => true,
		(error: unknown) => {
			toastError(error);
			return false;
		}
	);
}
