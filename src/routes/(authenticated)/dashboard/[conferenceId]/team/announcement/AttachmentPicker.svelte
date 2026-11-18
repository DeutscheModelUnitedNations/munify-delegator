<!--
	@component
	The files of an announcement in the editor: the ones it keeps, the ones picked to be uploaded
	with the next save, and the input that picks more.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { MAX_ANNOUNCEMENT_ATTACHMENTS } from '#lib/helpers/announcements';

	interface Props {
		kept: { id: string; fileName?: string | null; url?: string | null }[];
		added: File[];
	}

	let { kept = $bindable(), added = $bindable() }: Props = $props();

	const tooMany = $derived(kept.length + added.length > MAX_ANNOUNCEMENT_ATTACHMENTS);
	/** Both kinds as one list, each knowing how to take itself out. */
	const files = $derived([
		...kept.map((file) => ({
			key: `kept:${file.id}`,
			name: file.fileName ?? m.announcementAttachment(),
			icon: 'ph-paperclip',
			remove: () => (kept = kept.filter((other) => other.id !== file.id))
		})),
		...added.map((file, index) => ({
			key: `added:${index}`,
			name: file.name,
			icon: 'ph-upload-simple',
			remove: () => (added = added.filter((_, other) => other !== index))
		}))
	]);

	function pickFiles(event: Event & { currentTarget: HTMLInputElement }) {
		added = [...added, ...(event.currentTarget.files ?? [])];
		event.currentTarget.value = '';
	}
</script>

<ul class="flex flex-col gap-1 not-empty:mb-2">
	{#each files as file (file.key)}
		<li class="flex items-center gap-2 text-sm">
			<i aria-hidden="true" class="ph-duotone {file.icon}"></i>
			<span class="min-w-0 flex-1 truncate">{file.name}</span>
			<button
				type="button"
				class="btn btn-ghost btn-xs"
				aria-label={m.announcementAttachmentRemove({ file: file.name })}
				onclick={file.remove}
			>
				<i aria-hidden="true" class="ph-duotone ph-trash"></i>
			</button>
		</li>
	{/each}
</ul>
<input
	type="file"
	class="file-input file-input-sm w-full"
	multiple
	accept="application/pdf,image/png,image/jpeg,image/webp"
	aria-label={m.announcementAttachmentAdd()}
	onchange={pickFiles}
/>
<p class="text-xs {tooMany ? 'text-error' : 'text-base-content/60'}">
	{m.announcementAttachmentHint({ max: MAX_ANNOUNCEMENT_ATTACHMENTS })}
</p>
