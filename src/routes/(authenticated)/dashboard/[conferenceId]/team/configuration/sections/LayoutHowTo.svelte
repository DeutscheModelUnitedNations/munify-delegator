<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** How parts are placed on a template, folded away. */
	interface Props {
		/** Whether the document has a session list, but no sessions to show in it. */
		withoutSessions: boolean;
		/** The smallest side of the document's code, in millimetres, if it has one. */
		codeMinimum: number | undefined;
		/** Whether the document has fields a scan reads. */
		hasFields: boolean;
	}

	let { withoutSessions, codeMinimum, hasFields }: Props = $props();
</script>

<details class="collapse-arrow bg-base-200 rounded-box collapse">
	<summary class="collapse-title text-sm font-semibold">
		<i aria-hidden="true" class="ph-duotone ph-info"></i>
		{m.documentLayoutHowTo()}
	</summary>
	<div class="collapse-content text-base-content/70 flex flex-col gap-2 text-sm">
		<p>
			{withoutSessions ? m.certificateLayoutHintWithoutSessions() : m.certificateLayoutHint()}
		</p>
		{#if codeMinimum !== undefined}
			<p>{m.documentLayoutCodeMinimum({ size: codeMinimum })}</p>
		{/if}
		{#if hasFields}
			<p>{m.documentLayoutFieldsHint()}</p>
		{/if}
		<p>{m.documentLayoutSnapHint()}</p>
		<p>{m.documentLayoutNudgeHint()}</p>
	</div>
</details>
