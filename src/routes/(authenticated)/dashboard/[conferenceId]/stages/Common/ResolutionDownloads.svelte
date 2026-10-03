<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { conferenceResolutionsQuery } from '$lib/queries/conferenceResolutionsQuery';
	import { groupResolutionsByCommittee } from '$lib/services/resolutionGroups';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import type { ConferenceResolutionsQuery$result } from '$houdini';

	type ConferenceResolution = ConferenceResolutionsQuery$result['findManyResolutions'][number];

	let { conferenceId }: { conferenceId: string | undefined } = $props();

	$effect(() => {
		if (conferenceId) {
			conferenceResolutionsQuery.fetch({ variables: { conferenceId } });
		}
	});

	// The store's `data` is untyped here, so name the row type explicitly.
	const groupedResolutions = $derived(
		groupResolutionsByCommittee<ConferenceResolution>(
			$conferenceResolutionsQuery.data?.findManyResolutions
		)
	);
</script>

{#if $conferenceResolutionsQuery.fetching || groupedResolutions.length > 0}
	<DashboardSection
		icon="file-contract"
		title={m.adoptedResolutions()}
		description={m.adoptedResolutionsDownloadDescription()}
	>
		<div class="flex flex-col gap-4">
			{#each groupedResolutions as group (group.key)}
				<div class="flex flex-col gap-2">
					{#if group.committeeName}
						<h3 class="text-sm font-semibold opacity-70">{group.committeeName}</h3>
					{/if}
					<ul class="flex flex-col gap-2">
						{#each group.items as resolution (resolution.id)}
							<li>
								<a
									class="btn btn-outline btn-sm justify-start gap-2"
									href={`/api/resolution/${resolution.id}`}
									target="_blank"
									rel="noopener"
									download
								>
									<i class="fa-duotone fa-file-pdf text-primary"></i>
									<span class="truncate">{resolution.title}</span>
									<i class="fas fa-download ml-auto"></i>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="skeleton bg-base-200 h-16 w-full max-w-sm"></div>
			{/each}
		</div>
	</DashboardSection>
{/if}
