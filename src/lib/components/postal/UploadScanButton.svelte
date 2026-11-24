<!--
	@component
	Uploads scanned pages of one person's application documents by hand, several files at once.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { uploadScanFor } from './uploadScan';

	interface Props {
		conferenceId: string;
		userId: string;
	}

	let { conferenceId, userId }: Props = $props();

	let uploading = $state(false);

	const uploadError = (error: unknown) =>
		error instanceof Error ? error.message : m.genericToastError();

	/** Uploads one file; what fails is toasted, and the next is uploaded all the same. */
	async function uploadOne(file: File) {
		const promise = uploadScanFor({ file, conferenceId, userId });
		toast.promise(promise, { ...genericPromiseToastMessages, error: uploadError });
		await promise.catch(() => undefined);
	}

	async function upload(files: FileList | null) {
		if (uploading) return;
		uploading = true;
		try {
			for (const file of files ?? []) await uploadOne(file);
		} finally {
			uploading = false;
		}
	}
</script>

<label class="btn btn-sm {uploading ? 'btn-disabled' : ''}">
	<i aria-hidden="true" class="ph-duotone ph-upload-simple"></i>
	{m.postalScanUpload()}
	<input
		type="file"
		class="sr-only"
		multiple
		accept="application/pdf,image/jpeg,image/png,image/webp"
		disabled={uploading}
		onchange={async (event) => {
			const input = event.currentTarget;
			await upload(input.files);
			input.value = '';
		}}
	/>
</label>
