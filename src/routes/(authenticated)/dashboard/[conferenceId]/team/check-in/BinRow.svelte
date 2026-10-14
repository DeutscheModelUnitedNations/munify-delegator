<script lang="ts">
	import BinGroups from './BinGroups.svelte';
	import { m } from '$lib/paraglide/messages';
	import { binTone, letterRange } from './nametagSheets';

	interface Props {
		bin: {
			index: number;
			fromLetter: string | null;
			toLetter: string | null;
			nationParticipants: number;
			otherParticipants: number;
			participants: number;
		};
		conferenceId: string;
		binCount: number;
	}

	let { bin, conferenceId, binCount }: Props = $props();

	const range = $derived(letterRange(bin));
	const tone = $derived(binTone(bin.index));
</script>

<div class="bg-base-100 flex flex-col gap-3 rounded-lg p-2 md:flex-row md:items-start">
	<div class="flex w-full shrink-0 items-center gap-4 px-2 py-2 md:w-96">
		<span class="badge {tone.badge} badge-lg">
			{m.nametagBinTable()}
			{bin.index + 1}
		</span>
		<div class="flex min-w-0 grow flex-col">
			<span class="font-mono text-lg font-bold">
				{#if range}
					{range}
				{:else if bin.otherParticipants > 0}
					<span class="font-sans">{m.nametagBinOthers()}</span>
				{:else}
					<span class="text-base-content/50 font-sans">{m.nametagBinEmpty()}</span>
				{/if}
			</span>
			{#if bin.nationParticipants > 0 && bin.otherParticipants > 0}
				<span class="text-base-content/60 text-xs">
					{m.nametagBinNations()}: {bin.nationParticipants} · {m.nametagBinOthers()}: {bin.otherParticipants}
				</span>
			{/if}
		</div>
		<span class="text-2xl font-bold tabular-nums">{bin.participants}</span>
	</div>
	{#if bin.participants > 0}
		<div class="min-w-0 grow px-2 py-2 md:border-l md:border-base-300 md:ps-6">
			<svelte:boundary>
				<BinGroups {conferenceId} {binCount} index={bin.index} />
				{#snippet pending()}
					<span class="loading loading-dots"></span>
				{/snippet}
			</svelte:boundary>
		</div>
	{/if}
</div>
