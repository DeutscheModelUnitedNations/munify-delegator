<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import BadgeGeneratorLinks from '#lib/components/BadgeGeneratorLinks.svelte';
	import {
		committeeBadges,
		nonStateActorBadges,
		placardData,
		singleParticipantBadges,
		supervisorBadges,
		teamMemberBadges
	} from './badgeData';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			name: true
		})
	);

	// the day of the export, in every file name
	const stamp = new Date().toISOString().slice(0, 10);
</script>

<p class="text-base-content/60 col-span-full text-sm">
	<i aria-hidden="true" class="ph-duotone ph-info"></i>
	{m.badgeGeneratorHint()}
</p>
{#each committees as committee (committee.id)}
	<BadgeGeneratorLinks
		variant="tile"
		badges={() => committeeBadges({ conferenceId, committeeId: committee.id })}
		filename="{committee.name}_badges_{stamp}"
		label={committee.name}
	/>
{/each}
<BadgeGeneratorLinks
	variant="tile"
	badges={() => nonStateActorBadges(conferenceId)}
	filename="NSA_badges_{stamp}"
	label={m.nonStateActors()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={() => singleParticipantBadges(conferenceId)}
	filename="single_participants_badges_{stamp}"
	label={m.singleParticipants()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={() => supervisorBadges(conferenceId)}
	filename="supervisors_badges_{stamp}"
	label={m.supervisors()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={() => teamMemberBadges(conferenceId)}
	filename="team_members_badges_{stamp}"
	label={m.teamMembers()}
/>
<BadgeGeneratorLinks
	variant="tile"
	badges={() => placardData(conferenceId)}
	filename="placards_{stamp}"
	label={m.badgePlacards()}
/>
