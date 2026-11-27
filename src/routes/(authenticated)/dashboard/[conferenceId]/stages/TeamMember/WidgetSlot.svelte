<!--
	@component
	One widget of the team's overview behind its own boundary: a skeleton of its size while its
	first data loads, and `LoadError` if loading failed, so one slow or failing widget neither holds
	nor breaks the others.
-->
<script lang="ts">
	import LoadError from '#lib/components/LoadError.svelte';
	import { logger } from '#lib/logger';
	import type { WaitingAccess } from './teamWaiting';
	import type { PlacedWidget } from './teamWidgets';
	import CommitteesWidget from './widgets/CommitteesWidget.svelte';
	import CommunicationWidget from './widgets/CommunicationWidget.svelte';
	import EntranceWidget from './widgets/EntranceWidget.svelte';
	import MessagesWidget from './widgets/MessagesWidget.svelte';
	import NowWidget from './widgets/NowWidget.svelte';
	import PapersWidget from './widgets/PapersWidget.svelte';
	import ParticipantsWidget from './widgets/ParticipantsWidget.svelte';
	import PaymentsWidget from './widgets/PaymentsWidget.svelte';
	import ReadinessWidget from './widgets/ReadinessWidget.svelte';
	import TimelineWidget from './widgets/TimelineWidget.svelte';
	import WrapUpWidget from './widgets/WrapUpWidget.svelte';

	let {
		conferenceId,
		widget,
		access
	}: { conferenceId: string; widget: PlacedWidget; access: WaitingAccess } = $props();

	const size = $derived(widget.size);
	const span = $derived(size === 'large' ? 'lg:col-span-2' : '');
</script>

<svelte:boundary onerror={(error) => logger.error('Failed to load a team overview widget', error)}>
	{#if widget.id === 'timeline'}
		<TimelineWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'participants'}
		<ParticipantsWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'payments'}
		<PaymentsWidget {conferenceId} {size} />
	{:else if widget.id === 'committees'}
		<CommitteesWidget {conferenceId} {size} />
	{:else if widget.id === 'papers'}
		<PapersWidget {conferenceId} {size} />
	{:else if widget.id === 'communication'}
		<CommunicationWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'readiness'}
		<ReadinessWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'now'}
		<NowWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'entrance'}
		<EntranceWidget {conferenceId} {size} />
	{:else if widget.id === 'messages'}
		<MessagesWidget {conferenceId} {size} {access} />
	{:else if widget.id === 'wrapUp'}
		<WrapUpWidget {conferenceId} {size} {access} />
	{/if}

	{#snippet pending()}
		<div
			class="skeleton rounded-box {span} {size === 'large' ? 'h-64' : 'h-48'}"
			aria-hidden="true"
		></div>
	{/snippet}

	{#snippet failed(_error, reset)}
		<div class={span}><LoadError onretry={reset} /></div>
	{/snippet}
</svelte:boundary>
