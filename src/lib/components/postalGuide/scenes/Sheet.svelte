<!-- A printed page as we send it out: marks in the corners, a code, some text and a signature. -->
<script module lang="ts">
	/** The signature, as drawn on the page. */
	export const SIGNATURE = 'M14 80c4-10 6-10 6-2s5-9 8-5 2 6 6 1 5 2 10 0';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		x?: number;
		y?: number;
		/** A coloured bar at the top, to tell whose page it is. */
		owner?: string;
		/** The page's number, printed large. */
		number?: number | string;
		signed?: boolean;
		/** Fields to fill in, in place of the text. */
		fields?: boolean;
		/** Drawn on top of the page. */
		children?: Snippet;
	}

	let { x = 0, y = 0, owner, number, signed = true, fields = false, children }: Props = $props();

	const CORNERS = [
		[5, 5],
		[59, 5],
		[5, 88],
		[59, 88]
	];
	/** The dark fields of the little code, in a 5 × 5 grid. */
	const CODE = [0, 1, 2, 4, 5, 7, 9, 10, 11, 12, 14, 18, 20, 21, 23, 24];
</script>

<g transform="translate({x} {y})">
	<rect width="70" height="99" rx="2" class="paper" />
	{#each CORNERS as [cx, cy] (`${cx},${cy}`)}
		<rect x={cx} y={cy} width="6" height="6" class="ink mark" />
	{/each}
	{#if owner}
		<rect x="15" y="4" width="40" height="8" rx="4" fill={owner} />
	{/if}
	<g transform="translate(28 16)">
		{#each CODE as cell (cell)}
			<rect
				x={(cell % 5) * 2.8}
				y={Math.floor(cell / 5) * 2.8}
				width="2.8"
				height="2.8"
				class="ink"
			/>
		{/each}
	</g>
	{#if number}
		<text x="35" y="62" class="number">{number}</text>
	{:else if fields}
		<path d="M12 46h46M12 58h46M24 67.5h32" class="line" />
		<rect x="12" y="64" width="7" height="7" class="box" />
	{:else}
		<path d="M12 40h46M12 47h46M12 54h30" class="line" />
	{/if}
	{#if signed}
		<path d={SIGNATURE} class="signature" />
	{/if}
	<path d="M12 84h40" class="line" />
	{@render children?.()}
</g>

<style>
	.paper {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.2;
	}

	.ink {
		fill: var(--ink);
	}

	.line {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 2.4;
		stroke-linecap: round;
	}

	.box {
		fill: none;
		stroke: var(--ink);
	}

	.signature {
		fill: none;
		stroke: var(--color-info);
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.number {
		fill: var(--ink);
		font-size: 24px;
		font-weight: 700;
		text-anchor: middle;
	}
</style>
