import { errorToastMessage } from '#lib/utils/toast';
import { toast } from 'svelte-sonner';

/**
 * Runs a write while a loading flag is up and toasts the error when it fails.
 * Resolves to whether the write went through, so the caller knows to close its modal.
 */
export async function saveWithToast({
	setLoading,
	write
}: {
	setLoading: (loading: boolean) => void;
	write: () => Promise<void>;
}) {
	setLoading(true);
	try {
		await write();
		return true;
	} catch (error) {
		toast.error(errorToastMessage(error));
		return false;
	} finally {
		setLoading(false);
	}
}
