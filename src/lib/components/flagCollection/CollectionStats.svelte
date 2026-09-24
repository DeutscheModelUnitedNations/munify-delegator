<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Stats {
		totalFlags: number;
		completedFlags: number;
		totalPieces: number;
		foundPieces: number;
		unlockedPieces: number;
	}

	interface Props {
		stats: Stats;
	}

	let { stats }: Props = $props();

	let overallProgress = $derived(
		stats.totalPieces > 0 ? (stats.foundPieces / stats.totalPieces) * 100 : 0
	);
</script>

<div class="stats stats-vertical lg:stats-horizontal shadow bg-base-100 w-full">
	<div class="stat">
		<div class="stat-figure text-success">
			<i class="fa-solid fa-flag text-2xl"></i>
		</div>
		<div class="stat-title">{m.completedFlags()}</div>
		<div class="stat-value text-success">{stats.completedFlags}</div>
		<div class="stat-desc">{m.outOf()} {stats.totalFlags}</div>
	</div>

	<div class="stat">
		<div class="stat-figure text-primary">
			<i class="fa-solid fa-puzzle-piece text-2xl"></i>
		</div>
		<div class="stat-title">{m.foundPiecesLabel()}</div>
		<div class="stat-value text-primary">{stats.foundPieces}</div>
		<div class="stat-desc">{m.outOf()} {stats.totalPieces}</div>
	</div>

	<div class="stat">
		<div class="stat-figure text-warning">
			<i class="fa-solid fa-hourglass-half text-2xl"></i>
		</div>
		<div class="stat-title">{m.unlockedPiecesLabel()}</div>
		<div class="stat-value text-warning">{stats.unlockedPieces}</div>
		<div class="stat-desc">{m.awaitingReview()}</div>
	</div>

	<div class="stat">
		<div class="stat-figure">
			<div
				class="radial-progress text-success"
				style="--value:{overallProgress}; --size:3.5rem; --thickness: 4px;"
				role="progressbar"
			>
				{Math.round(overallProgress)}%
			</div>
		</div>
		<div class="stat-title">{m.overallProgress()}</div>
		<div class="stat-value">{Math.round(overallProgress)}%</div>
		<div class="stat-desc">{m.complete()}</div>
	</div>
</div>
