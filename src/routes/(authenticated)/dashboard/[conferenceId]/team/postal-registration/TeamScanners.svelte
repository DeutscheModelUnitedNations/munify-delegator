<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import formatNames from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import ScannerAccessRow from './ScannerAccessRow.svelte';

	/** The scanner logins of the others on the team, for project management to revoke. */
	interface Props {
		conferenceId: string;
		ownIds: string[];
	}

	let { conferenceId, ownIds }: Props = $props();

	const all = $derived(
		await client.liveQuery.teamScannerAccesses({
			__args: { conferenceId },
			id: true,
			name: true,
			ownerGivenName: true,
			ownerFamilyName: true,
			lastUsedAt: true,
			expiresAt: true
		})
	);
	const others = $derived(all.filter(({ id }) => !ownIds.includes(id)));
</script>

<section class="flex flex-col gap-2">
	<h3 class="font-semibold">{m.scannerSetupTeam()}</h3>
	<p class="text-base-content/70 text-sm">{m.scannerSetupTeamHint()}</p>
	<ul class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		{#each others as access (access.id)}
			{@const owner = formatNames({
				givenName: access.ownerGivenName ?? undefined,
				familyName: access.ownerFamilyName ?? undefined
			})}
			<ScannerAccessRow {access} {owner} />
		{:else}
			<li class="text-base-content/60 px-4 py-3 text-sm">{m.scannerSetupTeamNone()}</li>
		{/each}
	</ul>
</section>
