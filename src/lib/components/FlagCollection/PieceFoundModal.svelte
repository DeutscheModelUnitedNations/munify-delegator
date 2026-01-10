<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CompletionCelebration from './CompletionCelebration.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		flagName: string;
		flagAlpha2Code?: string | null;
		flagType: 'NATION' | 'NSA';
		fontAwesomeIcon?: string | null;
		pieceName: string;
		isComplete: boolean;
		foundCount: number;
		totalCount: number;
		onclose: () => void;
		onViewCollection?: () => void;
	}

	let {
		open = $bindable(),
		flagName,
		flagAlpha2Code,
		flagType,
		fontAwesomeIcon,
		pieceName,
		isComplete,
		foundCount,
		totalCount,
		onclose,
		onViewCollection
	}: Props = $props();

	const handleViewCollection = () => {
		open = false;
		onViewCollection?.();
	};
</script>

<Modal bind:open {onclose} title={m.pieceFound()}>
	<div class="flex flex-col items-center gap-4 p-4 relative">
		{#if isComplete}
			<CompletionCelebration />
		{/if}

		<div class="animate-bounce">
			{#if isComplete}
				<i class="fa-solid fa-trophy text-6xl text-warning"></i>
			{:else}
				<i class="fa-solid fa-puzzle-piece text-6xl text-primary"></i>
			{/if}
		</div>

		<div class="text-center">
			{#if isComplete}
				<h3 class="text-xl font-bold text-success">{m.flagComplete()}</h3>
				<p class="text-base-content/70 mt-2">{m.allPiecesCollected()}</p>
			{:else}
				<h3 class="text-xl font-bold">{m.newPieceUnlocked()}</h3>
				<p class="text-base-content/70 mt-2">{pieceName}</p>
			{/if}
		</div>

		<div class="flex items-center gap-3 bg-base-200 p-4 rounded-lg">
			{#if flagType === 'NATION' && flagAlpha2Code}
				<Flag size="sm" alpha2Code={flagAlpha2Code} />
			{:else}
				<Flag size="sm" nsa={true} icon={fontAwesomeIcon} />
			{/if}
			<div>
				<div class="font-semibold">{flagName}</div>
				<div class="text-sm text-base-content/60">
					{foundCount}/{totalCount}
					{m.piecesCollected()}
				</div>
				<progress
					class="progress progress-success w-32 h-2 mt-1"
					value={foundCount}
					max={totalCount}
				></progress>
			</div>
		</div>

		{#if isComplete}
			<div class="alert alert-success">
				<i class="fa-solid fa-party-horn"></i>
				<span>{m.congratulationsFlagComplete()}</span>
			</div>
		{/if}
	</div>

	{#snippet action()}
		<div class="flex gap-2">
			{#if onViewCollection}
				<button class="btn btn-ghost" onclick={handleViewCollection}>
					<i class="fa-solid fa-puzzle-piece"></i>
					{m.viewCollection()}
				</button>
			{/if}
			<button class="btn btn-primary" onclick={() => (open = false)}>
				{#if isComplete}
					<i class="fa-solid fa-party-horn"></i>
					{m.celebrate()}
				{:else}
					<i class="fa-solid fa-arrow-right"></i>
					{m.continueReviewing()}
				{/if}
			</button>
		</div>
	{/snippet}
</Modal>
