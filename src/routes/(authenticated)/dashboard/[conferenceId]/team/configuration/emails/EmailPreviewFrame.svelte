<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** A mail as it would go out, next to the form editing it. */
	interface Props {
		preview: { subject: string; html: string } | undefined;
	}

	let { preview }: Props = $props();
</script>

<div class="flex min-w-0 flex-col gap-2">
	<p class="text-base-content/60 text-sm">{m.emailSettingsPreviewHint()}</p>
	{#if preview}
		<p class="font-semibold">{preview.subject}</p>
		<iframe
			title={preview.subject}
			srcdoc={preview.html}
			sandbox=""
			class="border-base-300 rounded-box h-160 max-h-screen w-full border bg-white"
		></iframe>
	{/if}
</div>
