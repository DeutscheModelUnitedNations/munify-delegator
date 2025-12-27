<script lang="ts">
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import PaperEditor from '$lib/components/Paper/Editor';
	import { editorContentStore } from '$lib/components/Paper/Editor/editorStore';
	import { onMount } from 'svelte';
	import {
		compareEditorContentHash,
		hashEditorContent
	} from '$lib/components/Paper/Editor/contentHash';
	import { translatePaperStatus, translatePaperType } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import InfoChip from './InfoChip.svelte';
	import { getPaperStatusIcon, getPaperTypeIcon } from '$lib/services/enumIcons';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.getPaperDetailsForEditingQuery);
	let paperData = $derived($paperQuery?.data.findUniquePaper);

	let initialized = $state(false);

	let title = $derived(
		paperData?.agendaItem?.title
			? `${paperData.agendaItem.committee.abbreviation}: ${paperData.agendaItem.title}`
			: `${translatePaperType(paperData.type)}`
	);
	let nation = $derived(paperData.delegation.assignedNation);
	let nsa = $derived(paperData.delegation.assignedNonStateActor);
	let version = $derived(
		paperData.versions.reduce((acc, version) => (version.version > acc.version ? version : acc))
			.version
	);

	onMount(() => {
		$editorContentStore = paperData.versions[0].content;
		initialized = true;
	});
</script>

<div class="flex flex-col gap-2 w-full">
	{#if paperData}
		<div class="flex flex-row items-center gap-2 flex-wrap">
			<InfoChip
				icon={getPaperTypeIcon(paperData.type)}
				textContent={translatePaperType(paperData.type)}
			/>
			<InfoChip
				textContent={nation
					? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
					: nsa.name}
			>
				{#snippet startContent()}
					<Flag size="xs" alpha2Code={nation?.alpha2Code} {nsa} icon={nsa?.fontAwesomeIcon} />
				{/snippet}
			</InfoChip>
			<InfoChip
				icon={getPaperStatusIcon(paperData.status)}
				textContent={translatePaperStatus(paperData.status)}
			/>
			<InfoChip icon="fa-clock-rotate-left" textContent={m.version()}>
				{#snippet endContent()}
					<div class="badge font-bold font-mono">{version}</div>
				{/snippet}
			</InfoChip>
		</div>

		<h2 class="text-2xl font-bold bg-base-200 border-base-300 border-1 rounded-box p-2">
			{title}
		</h2>

		<div class="flex flex-row items-center gap-2 flex-wrap">
			<InfoChip
				icon="fa-plus"
				textContent={paperData.createdAt?.toLocaleDateString()}
				tooltip={m.createdAt()}
			/>
			<InfoChip
				icon="fa-pen"
				textContent={paperData.updatedAt?.toLocaleDateString()}
				tooltip={m.updatedAt()}
			/>
			<InfoChip
				icon="fa-inbox"
				textContent={paperData.firstSubmittedAt?.toLocaleDateString() ?? m.notYetSubmitted()}
				tooltip={m.submittedAt()}
			/>
		</div>
	{:else}
		<div>
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}
	{#if initialized}
		{#if paperData.type === 'WORKING_PAPER'}
			<PaperEditor.ResolutionFormat editable />
		{:else}
			<PaperEditor.PaperFormat editable />
		{/if}
	{/if}
</div>
