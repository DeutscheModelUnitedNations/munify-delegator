<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		paperId: string;
		/** The stored content that failed to parse, offered as a JSON download. */
		rawContent: unknown;
	}

	let { paperId, rawContent }: Props = $props();

	const downloadRawContent = () => {
		if (!rawContent) return;

		const jsonString = JSON.stringify(rawContent, null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `paper-${paperId}-raw-data.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
</script>

<div class="alert alert-error flex-col items-start gap-3">
	<div class="flex items-center gap-3">
		<i class="fa-solid fa-triangle-exclamation text-2xl"></i>
		<div>
			<p class="font-semibold">{m.paperInvalidFormat()}</p>
			<p class="text-sm opacity-80">{m.paperInvalidFormatDescription()}</p>
			{#if rawContent}
				<button class="btn btn-sm btn-outline mt-2" onclick={downloadRawContent}>
					<i class="fa-solid fa-download"></i>
					{m.paperInvalidFormatDownload()}
				</button>
			{/if}
		</div>
	</div>
</div>
