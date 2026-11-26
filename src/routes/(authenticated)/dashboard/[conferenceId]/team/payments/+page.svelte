<!--
	@component
	The team's payments page: first the cases the bank payment sync left for a person to decide, then
	looking a reference up to settle it by hand, last (collapsed) what the sync confirmed by itself.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { asCount } from '#lib/api/queryHelpers';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import type { PageProps } from './$types';
	import AutoConfirmed from './AutoConfirmed.svelte';
	import ReferenceLookup from './ReferenceLookup.svelte';
	import ReviewCases from './ReviewCases.svelte';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);

	const [conference, autoConfirmed] = await Promise.all([
		client.liveQuery.conference({ __args: { id: conferenceId }, currency: true }),
		client.liveQuery.bankTransfersCount({
			__args: {
				where: {
					result: 'RECEIVED',
					paymentTransaction: { conference: { id: { eq: conferenceId } } }
				}
			}
		})
	]);

	let autoCollapsed = $state(true);
</script>

<div class="flex w-full flex-col gap-10 md:p-10">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<p class="leading-relaxed text-base-content/70">{@html m.paymentAdminDescription()}</p>

	<ReviewCases {conferenceId} />

	<ReferenceLookup {conferenceId} />

	<DashboardSection
		icon="robot"
		title={m.paymentsAutoTitle()}
		description={m.paymentsAutoDescription()}
		collapsible
		bind:collapsed={autoCollapsed}
		tourAnchor="team.payments.auto"
	>
		{#snippet headerAction()}
			<span class="badge badge-soft badge-success">{asCount(autoConfirmed)}</span>
		{/snippet}
		{#if !autoCollapsed}
			<AutoConfirmed {conferenceId} currency={conference.currency ?? 'EUR'} />
		{/if}
	</DashboardSection>
</div>
