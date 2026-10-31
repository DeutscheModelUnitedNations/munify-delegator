<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { buildResolutionHeaderData } from '../../paperDisplay';
	import PaperHeaderCard from '../../PaperHeaderCard.svelte';
	import PaperContent from '../../PaperContent.svelte';
	import { createLoadedPaper } from '../../loadedPaper.svelte';
	import { conferenceHeaderInfo } from '../../conferenceHeaderInfo';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const paperData = $derived(
		await client.liveQuery.findPublicPaperContent({
			__args: { paperId: params.paperId },
			id: true,
			type: true,
			firstSubmittedAt: true,
			conference: { title: true, longTitle: true, emblemFile: { url: true } },
			delegation: {
				assignedRole: {
					kind: true,
					name: true,
					fontAwesomeIcon: true,
					nation: { alpha2Code: true, alpha3Code: true }
				}
			},
			agendaItem: {
				title: true,
				committee: { abbreviation: true, name: true, resolutionHeadline: true }
			},
			// Only the latest version is shown.
			versions: {
				__args: { orderBy: { version: 'desc' }, limit: 1 },
				id: true,
				content: true
			}
		})
	);

	const loaded = createLoadedPaper();

	// Reset and reinitialize when paper changes
	$effect(() => {
		if (paperData)
			loaded.loadIfNew({ paper: paperData, latestContent: paperData.versions.at(0)?.content });
	});

	const conferenceInfo = $derived(await conferenceHeaderInfo(paperData?.conference));

	let resolutionHeaderData = $derived(
		paperData
			? buildResolutionHeaderData({ paper: paperData, conference: conferenceInfo })
			: undefined
	);
</script>

<div class="flex flex-col gap-4 w-full">
	<!-- Back Button -->
	<div>
		<a
			href={resolve(`dashboard/${params.conferenceId}/paperhub?view=global`)}
			class="btn btn-ghost btn-sm"
		>
			<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			{m.backToConferencePapers()}
		</a>
	</div>

	{#if paperData}
		<PaperHeaderCard paper={paperData} />

		<!-- Read-Only Info Banner -->
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-eye"></i>
			<span>{m.readOnlyViewParticipant()}</span>
		</div>
	{:else}
		<div>
			<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}

	{#if loaded.initialized && paperData}
		<div class="w-full flex flex-col gap-4">
			<!-- Paper Content -->

			<PaperContent paper={paperData} {loaded} editable={false} headerData={resolutionHeaderData} />
		</div>
	{:else if !paperData}
		<div class="mt-6 w-full h-12 skeleton"></div>
	{/if}
</div>
