<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinkCards from '$lib/components/dashboard/DashboardLinkCards.svelte';
	import { getLinksForUserType, type DashboardLinkContext } from '$lib/data/dashboardLinks';

	/** The quick links that lead to something public: the seat distribution and the preparation guide. */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const PUBLIC_LINKS = ['seats', 'preparation'];

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			state: true,
			linkToPreparationGuide: true
		})
	);

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId,
		userType: 'singleParticipant',
		conferenceState: conference.state,
		linkToPreparationGuide: conference.linkToPreparationGuide
	});

	const visibleLinks = $derived(
		getLinksForUserType('singleParticipant', linkContext).filter((link) =>
			PUBLIC_LINKS.includes(link.id)
		)
	);
</script>

{#if visibleLinks.length > 0}
	<DashboardSection icon="link" title={m.quickLinks()} description={m.quickLinksDescription()}>
		<DashboardLinkCards links={visibleLinks} context={linkContext} />
	</DashboardSection>
{/if}
