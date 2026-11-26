<!--
	@component
	The money of a transfer, a coin flying from the phone's send button (106 174) into the bank's
	screen (324 166): with the wrong transfer at 20 to 36 % of the scene, with the right one at 72 to
	82 %, or with only one of them. A scene that moves it itself takes `flight="none"` and wraps it,
	the coin then resting at `x`/`y`.
-->
<script lang="ts">
	interface Props {
		flight?: 'both' | 'wrong' | 'right' | 'none';
		/** Of the coin, not of its way. */
		size?: number;
		/** Starts its flights later, as a part of the scene. */
		delay?: number;
		/** A bank on the way bites off a part at the top of the wrong flight. */
		bitten?: boolean;
		x?: number;
		y?: number;
	}

	let { flight = 'both', size = 1, delay = 0, bitten = false, x = 106, y = 174 }: Props = $props();

	const maskId = $props.id();
	/** Both flights are two coins, one for each. */
	const flights = $derived(flight === 'both' ? (['wrong', 'right'] as const) : [flight]);
</script>

{#each flights as way (way)}
	<g transform="translate({x} {y})">
		<g class="coin {way}" style:--delay={delay}>
			<g transform="scale({size})">
				{#if bitten && way === 'wrong'}
					<mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40">
						<rect x="-20" y="-20" width="40" height="40" fill="white" />
						<circle cx="11" cy="-10" r="8" fill="black" class="bite" />
					</mask>
					<path d="M6 -8l4 1-2 4z" class="face crumb" />
				{/if}
				<g mask={bitten && way === 'wrong' ? `url(#${maskId})` : undefined}>
					<circle r="13" class="face" />
					<circle r="9.5" class="rim" />
					<path d="M3 -2.9A4 4 0 1 0 3 2.9M-4.6 -1.1h5M-4.6 1.3h5" class="mark" />
				</g>
			</g>
		</g>
	</g>
{/each}

<style>
	.face {
		fill: #f2b632;
	}

	.rim {
		fill: none;
		stroke: #c98a12;
		stroke-width: 1.5;
	}

	.mark {
		fill: none;
		stroke: #8a5a00;
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.wrong {
		animation: fly-wrong var(--scene) calc(var(--scene) * var(--delay)) infinite both;
	}

	.right {
		animation: fly-right var(--scene) calc(var(--scene) * var(--delay)) infinite both;
	}

	.bite {
		animation: bite var(--scene) infinite both;
	}

	.crumb {
		animation: crumb var(--scene) infinite both;
	}

	/* Up out of the phone, over in an arc, and into the screen */
	@keyframes fly-wrong {
		0%,
		19% {
			opacity: 0;
			transform: none;
		}
		21% {
			opacity: 1;
			transform: translate(0, -24px) scale(1.1);
			animation-timing-function: ease-out;
		}
		28% {
			transform: translate(110px, -110px) rotate(180deg);
			animation-timing-function: ease-in;
		}
		35% {
			opacity: 1;
			transform: translate(218px, -8px) rotate(360deg) scale(0.6);
		}
		37%,
		100% {
			opacity: 0;
			transform: translate(218px, -8px) scale(0);
		}
	}

	@keyframes fly-right {
		0%,
		72% {
			opacity: 0;
			transform: none;
		}
		73% {
			opacity: 1;
			transform: translate(0, -24px) scale(1.1);
			animation-timing-function: ease-out;
		}
		77% {
			transform: translate(110px, -110px) rotate(180deg);
			animation-timing-function: ease-in;
		}
		81% {
			opacity: 1;
			transform: translate(218px, -8px) rotate(360deg) scale(0.6);
		}
		83%,
		100% {
			opacity: 0;
			transform: translate(218px, -8px) scale(0);
		}
	}

	/* Taken at the top of the arc, whole again for the right flight */
	@keyframes bite {
		0%,
		26% {
			transform: scale(0);
		}
		28%,
		62% {
			transform: scale(1);
		}
		63%,
		100% {
			transform: scale(0);
		}
	}

	@keyframes crumb {
		0%,
		26% {
			opacity: 0;
			transform: none;
		}
		27% {
			opacity: 1;
			transform: none;
		}
		36%,
		100% {
			opacity: 0;
			transform: translate(14px, 70px) rotate(200deg);
		}
	}
</style>
