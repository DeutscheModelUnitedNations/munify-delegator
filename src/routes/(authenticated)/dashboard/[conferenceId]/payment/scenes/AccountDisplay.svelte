<!--
	@component
	The conference's account at the right of the stage, the payment guide's counterpart of the
	postal guide's scanner: a bank's portico whose doorway is a screen reporting whether a payment
	could be matched, at the beats of `Scene` (`ScreenSigns`). Money flies into it at (324 166).
-->
<script lang="ts">
	import Jam from '#lib/components/postalGuide/scenes/Jam.svelte';
	import ScreenSigns from '#lib/components/postalGuide/scenes/ScreenSigns.svelte';

	interface Props {
		/** Without an error, or well all along. */
		runs?: 'faulty' | 'faultless' | 'well';
	}

	let { runs = 'faulty' }: Props = $props();

	const COLUMNS = [4, 20, 74, 90];
</script>

<g transform="translate(272 108)">
	<Jam shakes={runs === 'faulty'}>
		<rect x="2" y="34" width="100" height="50" class="hall" />
		<path d="M-6 26 L52 0 L110 26 Z" class="pediment" />
		<path d="M10 22 L52 4 L94 22 Z" class="tympanum" />
		<rect x="-6" y="26" width="116" height="9" rx="1.5" class="stone" />
		{#each COLUMNS as x (x)}
			<rect x={x - 2} y="35" width="14" height="4" rx="1" class="stone" />
			<rect {x} y="39" width="10" height="41" class="column" />
			<path d="M{x + 3.3} 41v37M{x + 6.7} 41v37" class="flute" />
			<rect x={x - 2} y="80" width="14" height="4" rx="1" class="stone" />
		{/each}
		<rect x="-6" y="84" width="116" height="6" rx="1.5" class="stone" />
		<rect x="-12" y="90" width="128" height="6" rx="1.5" class="stone" />
		<ScreenSigns x={52} y={58} {runs} />
	</Jam>
</g>

<style>
	.stone,
	.pediment {
		fill: var(--color-primary);
	}

	.tympanum,
	.column {
		fill: color-mix(in oklab, var(--color-primary) 45%, var(--color-base-100));
	}

	.flute {
		stroke: color-mix(in oklab, var(--color-primary) 70%, var(--color-base-100));
		stroke-width: 1.2;
	}

	.hall {
		fill: color-mix(in oklab, var(--color-primary) 80%, black);
	}
</style>
