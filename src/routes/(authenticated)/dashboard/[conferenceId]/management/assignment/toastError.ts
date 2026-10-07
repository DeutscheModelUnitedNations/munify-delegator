import { m } from '$lib/paraglide/messages';
import { toast } from 'svelte-sonner';

/** Shows why a draft mutation failed: the server's message, or the generic one. */
export function toastError(error: unknown) {
	toast.error(error instanceof Error ? error.message : m.genericToastError());
}
