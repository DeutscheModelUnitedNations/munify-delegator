<!--
	@component
	The way to the messages for a delegation member or single participant who has no quick links
	yet (or no more): while registering, during the selection and after a rejection. The team and
	the own delegation are reachable from the registration on.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '#lib/components/dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '#lib/components/dashboard/DashboardLinkCard.svelte';
	import MessagesLinkInfo from '#lib/components/chat/MessagesLinkInfo.svelte';

	/** `visible`: whether the caller writes and has no quick links that hold the way there. */
	let { conferenceId, visible }: { conferenceId: string; visible: boolean } = $props();
</script>

{#if visible}
	<DashboardSection
		icon="chats-circle"
		title={m.chatMessages()}
		description={m.chatEntryDescription()}
	>
		<DashboardLinksGrid>
			<DashboardLinkCard
				href={resolve('/(authenticated)/dashboard/[conferenceId]/messages', { conferenceId })}
				icon="chats-circle"
				title={m.chatMessages()}
				description={m.chatEntryLinkDescription()}
			>
				{#snippet info()}
					<MessagesLinkInfo {conferenceId} />
				{/snippet}
			</DashboardLinkCard>
		</DashboardLinksGrid>
	</DashboardSection>
{/if}
