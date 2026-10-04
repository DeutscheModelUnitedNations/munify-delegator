<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { downloadResolution } from '$lib/api/downloadResolution';
	import { groupResolutionsByCommittee } from '$lib/helpers/resolutionGroups';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const resolutions = $derived(
		await client.liveQuery.resolutions({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'asc' }
			},
			id: true,
			title: true,
			committee: { id: true, name: true, abbreviation: true }
		})
	);
	const groupedResolutions = $derived(
		groupResolutionsByCommittee<(typeof resolutions)[number]>(resolutions)
	);
</script>

{#if groupedResolutions.length > 0}
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
								<button
									type="button"
									class="btn btn-outline btn-sm justify-start gap-2"
									onclick={() => downloadResolution(resolution.id)}
								>
									<i class="fa-duotone fa-file-pdf text-primary"></i>
									<span class="truncate">{resolution.title}</span>
									<i class="fas fa-download ml-auto"></i>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</DashboardSection>
{/if}
