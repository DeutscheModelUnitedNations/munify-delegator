<!--
	@component
	The conference's states as steps, the current one marked (`aria-current="step"`). In a compact
	widget on a narrow screen only the current state's name shows.
-->
<script lang="ts">
	import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';
	import { translateState } from '#lib/components/dashboard/conferenceHeader';
	import { m } from '#lib/paraglide/messages';
	import { STATE_ORDER } from './timeline';

	let { state, compact }: { state: ConferencestateEnum; compact: boolean } = $props();

	const current = $derived(STATE_ORDER.indexOf(state));
	const barClass = (index: number) =>
		index < current ? 'bg-accent' : index === current ? 'bg-primary' : 'bg-base-300';
	const nameClass = (index: number) =>
		[
			index === current ? 'font-bold' : 'text-base-content/70',
			compact && index !== current ? 'max-md:sr-only' : ''
		].join(' ');
</script>

<ol class="grid grid-cols-5 gap-1" aria-label={m.teamWidgetTimelineStates()}>
	{#each STATE_ORDER as step, index (step)}
		<li class="flex min-w-0 flex-col gap-1.5" aria-current={index === current ? 'step' : undefined}>
			<div class="h-2 rounded-full {barClass(index)}"></div>
			<span class="truncate text-xs {nameClass(index)}">{translateState(step)}</span>
		</li>
	{/each}
</ol>
