<!--
	@component
	The document scanner at the right of the stage. Its display is idle, then shows an error, then
	that all is well, then is idle again, at the beats of `Scene` (`ScreenSigns`). Pages go in from
	above, behind the body (`Feed`).
-->
<script lang="ts">
	import Jam from './Jam.svelte';
	import ScreenSigns from './ScreenSigns.svelte';

	interface Props {
		/** Without an error, or well all along. */
		runs?: 'faulty' | 'faultless' | 'well';
	}

	let { runs = 'faulty' }: Props = $props();
</script>

<g transform="translate(272 134)">
	<Jam shakes={runs === 'faulty'}>
		<path d="M14 2 L22 -30 H82 L90 2 Z" class="tray" />
		<rect width="104" height="66" rx="8" class="case" />
		<rect x="10" y="-3" width="84" height="7" rx="3.5" class="slot" />
		<rect x="8" y="64" width="16" height="6" rx="2" class="slot" />
		<rect x="80" y="64" width="16" height="6" rx="2" class="slot" />
		<rect x="12" y="50" width="80" height="5" rx="2.5" class="slot" />
		<ScreenSigns x={52} y={27} {runs} />
	</Jam>
</g>

<style>
	.case {
		fill: var(--color-primary);
	}

	.tray {
		fill: color-mix(in oklab, var(--color-primary) 55%, var(--color-base-100));
	}

	.slot {
		fill: color-mix(in oklab, var(--color-primary) 60%, black);
	}
</style>
