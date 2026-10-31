<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { succeeded } from '../toastError';

	/**
	 * Releases the assignment, or hides it again. Releasing sends nothing: `onReleased` is where the
	 * page offers the result mails.
	 */
	interface Props {
		conferenceId: string;
		released: boolean;
		onClose: () => void;
		onReleased: () => void;
	}

	let { conferenceId, released, onClose, onReleased }: Props = $props();

	let saving = $state(false);

	async function confirm() {
		saving = true;
		const done = await succeeded(
			client.mutate.setAssignmentReleased({ __args: { conferenceId, released: !released } })
		);
		saving = false;
		if (!done) return;
		toast.success(released ? m.assignmentHidden() : m.assignmentReleasedToast());
		if (!released) onReleased();
		onClose();
	}
</script>

<ActionModal
	title={released ? m.assignmentHideTitle() : m.assignmentReleaseTitle()}
	confirmLabel={released ? m.assignmentHide() : m.assignmentRelease()}
	confirmClass={released ? 'btn-warning' : 'btn-primary'}
	loading={saving}
	onConfirm={confirm}
	{onClose}
>
	<p>{released ? m.assignmentHideText() : m.assignmentReleaseText()}</p>
</ActionModal>
