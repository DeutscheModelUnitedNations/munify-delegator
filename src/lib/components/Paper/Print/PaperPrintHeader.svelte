<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { translatePaperType } from '$lib/services/enumTranslations';
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
		topic
	}: Props = $props();

	// Get entity name (nation or NSA)
	let entityName = $derived(
		nationAlpha3Code ? getFullTranslatedCountryNameFromISO3Code(nationAlpha3Code) : nsaName
	);
</script>

<div class="paper-print-header">
	<!-- Top Row: Conference Name and Paper Type -->
	<div class="header-top-row">
		<div class="conference-name">{conferenceName}</div>
		<div class="paper-type-badge">{translatePaperType(paperType)}</div>
	</div>

	<!-- Divider -->
	<hr class="header-divider" />

	<!-- Entity Section: Flag + Name -->
	<div class="entity-section">
		{#if nationAlpha2Code}
			<Flag size="sm" alpha2Code={nationAlpha2Code} />
		{:else if nsaName}
			<Flag size="sm" nsa icon={nsaIcon} />
		{/if}
		<div class="entity-name">{entityName}</div>
	</div>

	<!-- Committee and Topic -->
	{#if committeeName || topic}
		<div class="metadata-section">
			{#if committeeName}
				<div class="metadata-row">
					<span class="metadata-label">{m.committee()}:</span>
					<span class="metadata-value"
						>{committeeName}{committeeAbbreviation ? ` (${committeeAbbreviation})` : ''}</span
					>
				</div>
			{/if}
			{#if topic}
				<div class="metadata-row">
					<span class="metadata-label">{m.resolutionTopic().replace(':', '')}:</span>
					<span class="metadata-value">{topic}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Divider -->
	<hr class="content-divider" />
</div>

<style>
	.paper-print-header {
		font-family: 'Times New Roman', Times, serif;
		color: #1a1a1a;
		margin-bottom: 2rem;
	}

	.header-top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.conference-name {
		font-size: 1.2rem;
		font-weight: bold;
	}

	.paper-type-badge {
		font-size: 0.9rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid #1a1a1a;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.header-divider {
		border: none;
		border-top: 1px solid #1a1a1a;
		margin: 0.5rem 0 1.5rem 0;
	}

	.entity-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.entity-name {
		font-size: 1.6rem;
		font-weight: bold;
	}

	.metadata-section {
		margin-bottom: 1rem;
	}

	.metadata-row {
		margin-bottom: 0.25rem;
	}

	.metadata-label {
		font-weight: bold;
	}

	.metadata-value {
		margin-left: 0.5rem;
	}

	.content-divider {
		border: none;
		border-top: 2px solid #1a1a1a;
		margin: 1rem 0 0 0;
	}
</style>
