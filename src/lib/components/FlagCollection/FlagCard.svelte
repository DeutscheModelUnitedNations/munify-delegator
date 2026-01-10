<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import PuzzleGrid from './PuzzleGrid.svelte';

	interface Piece {
		id: string;
		agendaItemId: string | null;
		agendaItemTitle: string | null;
		committeeAbbreviation: string | null;
		state: 'LOCKED' | 'UNLOCKED' | 'FOUND';
	}

	interface FlagProgress {
		id: string;
		type: 'NATION' | 'NSA';
		alpha2Code: string | null;
		name: string;
		abbreviation: string | null;
		fontAwesomeIcon: string | null;
		totalPieces: number;
		foundPieces: number;
		unlockedPieces: number;
		pieces: Piece[];
		isComplete: boolean;
	}

	interface Props {
		flag: FlagProgress;
	}

	let { flag }: Props = $props();
	let expanded = $state(false);

	let progressPercent = $derived(
		flag.totalPieces > 0 ? (flag.foundPieces / flag.totalPieces) * 100 : 0
	);
</script>

<div
	class="card bg-base-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
	class:ring-2={flag.isComplete}
	class:ring-success={flag.isComplete}
	class:flag-complete-pulse={flag.isComplete}
	onclick={() => (expanded = !expanded)}
	onkeypress={(e) => e.key === 'Enter' && (expanded = !expanded)}
	role="button"
	tabindex="0"
>
	<div class="p-3">
		<div class="flex items-center gap-2 mb-2">
			{#if flag.type === 'NATION' && flag.alpha2Code}
				<Flag size="xs" alpha2Code={flag.alpha2Code} />
			{:else}
				<Flag size="xs" nsa={true} icon={flag.fontAwesomeIcon} />
			{/if}
			<span class="font-semibold text-sm truncate flex-1" title={flag.name}>{flag.name}</span>
			{#if flag.isComplete}
				<i class="fa-solid fa-trophy text-warning text-xs"></i>
			{/if}
		</div>

		<PuzzleGrid pieces={flag.pieces} compact={!expanded} />

		<div class="flex justify-between items-center mt-2 text-xs">
			<span class="text-base-content/60">
				{flag.foundPieces}/{flag.totalPieces}
			</span>
			<progress class="progress progress-success w-16 h-2" value={progressPercent} max="100"
			></progress>
		</div>

		{#if expanded && flag.pieces.length > 0}
			<div class="mt-3 pt-3 border-t border-base-200">
				<ul class="text-xs space-y-1">
					{#each flag.pieces as piece}
						<li class="flex items-center gap-2">
							{#if piece.state === 'FOUND'}
								<i class="fa-solid fa-check text-success"></i>
							{:else if piece.state === 'UNLOCKED'}
								<i class="fa-solid fa-puzzle-piece text-primary/50"></i>
							{:else}
								<i class="fa-solid fa-lock text-base-content/30"></i>
							{/if}
							<span class="truncate {piece.state === 'LOCKED' ? 'opacity-50' : ''}">
								{#if piece.committeeAbbreviation}
									<span class="font-semibold">{piece.committeeAbbreviation}:</span>
								{/if}
								{piece.agendaItemTitle ?? 'Piece'}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

<style>
	.flag-complete-pulse {
		animation: flag-complete 2s infinite;
	}

	@keyframes flag-complete {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(var(--color-success) / 0.4);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(var(--color-success) / 0);
		}
	}
</style>
