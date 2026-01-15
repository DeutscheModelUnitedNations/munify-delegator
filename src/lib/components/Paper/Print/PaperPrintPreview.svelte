<script lang="ts">
	import PaperPrintHeader from './PaperPrintHeader.svelte';
	import ReadOnlyContent from '$lib/components/Paper/Editor/ReadOnlyContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PaperType$options } from '$houdini';

	interface Props {
		conferenceName: string;
		paperType: PaperType$options;
		nationAlpha2Code?: string;
		nationAlpha3Code?: string;
		nsaName?: string;
		nsaIcon?: string | null;
		committeeName?: string;
		committeeAbbreviation?: string;
		topic?: string;
		content: any;
	}

	let {
		conferenceName,
		paperType,
		nationAlpha2Code,
		nationAlpha3Code,
		nsaName,
		nsaIcon,
		committeeName,
		committeeAbbreviation,
		topic,
		content
	}: Props = $props();

	// Get disclaimer text for footer
	let disclaimerText = $derived(m.paperPrintDisclaimer({ conferenceName }));
</script>

<div class="paper-print-preview">
	<PaperPrintHeader
		{conferenceName}
		{paperType}
		{nationAlpha2Code}
		{nationAlpha3Code}
		{nsaName}
		{nsaIcon}
		{committeeName}
		{committeeAbbreviation}
		{topic}
	/>

	<!-- Paper Content -->
	<div class="paper-content">
		<ReadOnlyContent {content} />
	</div>

	<!-- Footer with disclaimer -->
	<div class="print-footer">
		<div class="footer-disclaimer">{disclaimerText}</div>
	</div>
</div>

<style>
	.paper-print-preview {
		font-family: 'Times New Roman', Times, serif;
		font-size: 0.95rem;
		line-height: 1.7;
		width: 100%;
		max-width: 900px;
		padding: 2rem;
		background: white;
		color: #1a1a1a;
		min-height: 100vh;
		position: relative;
	}

	.paper-content {
		margin-top: 2rem;
	}

	.paper-content :global(.prose) {
		max-width: none;
		font-family: 'Times New Roman', Times, serif;
	}

	.paper-content :global(p) {
		margin-bottom: 1rem;
		text-align: justify;
	}

	.paper-content :global(h2) {
		font-size: 1.3rem;
		font-weight: bold;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.paper-content :global(h3) {
		font-size: 1.1rem;
		font-weight: bold;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.paper-content :global(ul),
	.paper-content :global(ol) {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}

	.print-footer {
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid #d1d5db;
	}

	.footer-disclaimer {
		font-size: 0.7rem;
		color: #6b7280;
		text-align: center;
		line-height: 1.4;
	}

	/* Print-specific styles */
	@media print {
		.paper-print-preview {
			padding: 0;
			max-width: none;
		}

		.print-footer {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: white;
			padding: 0.5rem 2cm;
		}
	}
</style>
