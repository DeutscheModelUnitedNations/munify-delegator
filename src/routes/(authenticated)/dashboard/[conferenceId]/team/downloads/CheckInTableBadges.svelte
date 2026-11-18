<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import BadgeGeneratorLinks from '#lib/components/BadgeGeneratorLinks.svelte';
	import { letterRange } from '../check-in/nametagSheets';
	import { checkInTableBadges } from './badgeData';

	let { conferenceId }: { conferenceId: string } = $props();

	// the bins of the saved count, as the check-in page and the table signs show them
	const [conference, bins] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, nametagBinCount: true }),
			client.liveQuery.nametagBins({
				__args: { conferenceId },
				index: true,
				fromLetter: true,
				toLetter: true,
				participants: true
			})
		])
	);
	const binCount = $derived(conference.nametagBinCount);
	const tables = $derived(bins.filter((bin) => bin.participants > 0));

	const stamp = new Date().toISOString().slice(0, 10);
</script>

<p class="text-base-content/60 col-span-full text-sm">
	<i aria-hidden="true" class="ph-duotone ph-info"></i>
	{m.badgeTablesHint()}
	<a
		class="link"
		href={resolve('/(authenticated)/dashboard/[conferenceId]/team/check-in', { conferenceId })}
	>
		{m.badgeTablesSplitLink()}
	</a>
</p>
{#each tables as bin (bin.index)}
	{@const range = letterRange(bin)}
	<BadgeGeneratorLinks
		variant="tile"
		badges={() => checkInTableBadges({ conferenceId, binCount, index: bin.index })}
		filename="table_{bin.index + 1}_{range?.replaceAll(' ', '') ?? 'others'}_badges_{stamp}"
		label="{m.nametagBinTable()} {bin.index + 1} · {range ?? m.nametagBinOthers()}"
	/>
{:else}
	<p class="text-base-content/60 col-span-full text-sm">{m.badgeTablesEmpty()}</p>
{/each}
