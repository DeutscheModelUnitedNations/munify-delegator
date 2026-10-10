<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';

	let { conferenceId, binCount, index }: { conferenceId: string; binCount: number; index: number } =
		$props();

	// Only rendered once the row is opened
	const groups = $derived(
		await client.query.nametagBinGroups({
			__args: { conferenceId, binCount, index },
			nationAlpha3Code: true,
			roleName: true,
			sortName: true,
			nationAlpha2Code: true,
			fontAwesomeIcon: true,
			participants: true
		})
	);

	const rows = $derived(
		groups
			.map((group) => ({
				// a nation is named in the conference's language, the one it is filed by
				label: group.nationAlpha3Code ? group.sortName : (group.roleName ?? ''),
				alpha2Code: group.nationAlpha2Code,
				icon: group.fontAwesomeIcon,
				participants: group.participants,
				sortName: group.sortName
			}))
			.sort((a, b) => a.sortName.localeCompare(b.sortName))
	);
</script>

{#if rows.length === 0}
	<p class="text-base-content/60 text-sm">{m.nametagBinEmpty()}</p>
{:else}
	<ul class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2 xl:grid-cols-3">
		{#each rows as row, i (i)}
			<li class="flex items-center justify-between gap-3 py-1">
				<span class="flex min-w-0 items-center gap-3">
					{#if row.alpha2Code}
						<Flag alpha2Code={row.alpha2Code} size="xs" />
					{:else}
						<i
							class="fa-sharp-duotone fa-solid fa-{(row.icon ?? 'user').replace(
								'fa-',
								''
							)} w-5 text-center"
						></i>
					{/if}
					<span class="truncate">{row.label}</span>
				</span>
				<span class="text-base-content/60 shrink-0 tabular-nums">{row.participants}</span>
			</li>
		{/each}
	</ul>
{/if}
