import { toast } from 'svelte-sonner';
import { m } from '$lib/paraglide/messages';

/**
 * Runs a write while a loading flag is up and toasts the error when it fails.
 * Resolves to whether the write went through, so the caller knows to close its modal.
 */
export async function saveWithToast(
	setLoading: (loading: boolean) => void,
	write: () => Promise<void>
) {
	setLoading(true);
	try {
		await write();
		return true;
	} catch (error) {
		toast.error(error instanceof Error ? error.message : m.genericToastError());
		return false;
	} finally {
		setLoading(false);
	}
}
