<!-- A page is crumpled up; then it is folded cleanly in three, like a letter, into an envelope. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const clipId = $props.id();
</script>

<Scene>
	<!-- The thirds of the page, which lies at 89, 70 -->
	<clipPath id="{clipId}-top"><rect x="80" y="60" width="90" height="43" /></clipPath>
	<clipPath id="{clipId}-middle"><rect x="80" y="103" width="90" height="33" /></clipPath>
	<clipPath id="{clipId}-bottom"><rect x="80" y="136" width="90" height="43" /></clipPath>

	<Scanner />
	<g transform="translate(70 148)">
		<g class="envelope"><path d="M0 2L54 -24L108 2Z" class="back" /></g>
	</g>
	<g class="page">
		<g clip-path="url(#{clipId}-middle)"><Sheet x={89} y={70} /></g>
		<g class="bottom"><g clip-path="url(#{clipId}-bottom)"><Sheet x={89} y={70} /></g></g>
		<g class="top"><g clip-path="url(#{clipId}-top)"><Sheet x={89} y={70} /></g></g>
		<rect x="89" y="103" width="70" height="33" class="flap bottom-flap" />
		<rect x="89" y="103" width="70" height="33" class="flap top-flap" />
	</g>
	<g transform="translate(70 148)">
		<g class="envelope">
			<path d="M0 0L54 22L108 0V50q0 4-4 4H4q-4 0-4-4Z" class="front" />
		</g>
	</g>
	<g transform="translate(96 92)">
		<g class="ball">
			<path d="M8 10L26 0l20 6 8 18-6 22-22 8L6 44 0 24Z" class="crumpled" />
			<path d="M8 10l18 14 20-18M0 24l26 0-8 26M26 24l28 0M26 24l22 22" class="crease" />
		</g>
	</g>
	<Strike x={123} y={160} size={0.85} />
	<Check x={180} y={196} />
</Scene>

<style>
	.back {
		fill: color-mix(in oklab, var(--color-warning) 80%, black);
	}

	.front {
		fill: var(--color-warning);
	}

	.flap {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.2;
	}

	.crumpled {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.crease {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 2;
	}

	.page {
		transform-box: view-box;
		transform-origin: 124px 119.5px;
		animation: page var(--scene) infinite both;
	}

	.ball {
		animation: ball var(--scene) infinite both;
	}

	.envelope {
		animation: envelope var(--scene) infinite both;
	}

	/* Folded at the edges between the thirds */
	.bottom,
	.bottom-flap {
		transform-box: view-box;
		transform-origin: 124px 136px;
	}

	.top,
	.top-flap {
		transform-box: view-box;
		transform-origin: 124px 103px;
	}

	.bottom {
		animation: bottom var(--scene) infinite both;
	}

	.bottom-flap {
		animation: bottom-flap var(--scene) infinite both;
	}

	.top {
		animation: top var(--scene) infinite both;
	}

	.top-flap {
		animation: top-flap var(--scene) infinite both;
	}

	@keyframes page {
		0%,
		6% {
			opacity: 1;
			transform: none;
		}
		10% {
			transform: scale(0.9, 0.8) rotate(8deg) skewX(8deg);
		}
		14% {
			transform: scale(0.6, 0.7) rotate(-20deg) skewY(-14deg);
		}
		18% {
			opacity: 1;
			transform: scale(0.4) rotate(60deg) skewX(16deg);
		}
		19%,
		64% {
			opacity: 0;
			transform: scale(0.3);
		}
		65% {
			opacity: 1;
			transform: scale(0.4);
		}
		69%,
		78% {
			transform: none;
			animation-timing-function: ease-in;
		}
		84%,
		92% {
			transform: translateY(52px);
			animation-timing-function: ease-in;
		}
		96% {
			transform: translate(-200px, 52px);
		}
		/* the envelope is off, the next page comes */
		96.1% {
			transform: translateX(-200px);
			animation-timing-function: ease-out;
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes bottom {
		0%,
		70% {
			transform: none;
			animation-timing-function: ease-in;
		}
		72%,
		96% {
			transform: scaleY(0);
		}
		96.1%,
		100% {
			transform: none;
		}
	}

	@keyframes bottom-flap {
		0%,
		72% {
			transform: scaleY(0);
			animation-timing-function: ease-out;
		}
		74%,
		96% {
			transform: none;
		}
		96.1%,
		100% {
			transform: scaleY(0);
		}
	}

	@keyframes top {
		0%,
		74% {
			transform: none;
			animation-timing-function: ease-in;
		}
		76%,
		96% {
			transform: scaleY(0);
		}
		96.1%,
		100% {
			transform: none;
		}
	}

	@keyframes top-flap {
		0%,
		76% {
			transform: scaleY(0);
			animation-timing-function: ease-out;
		}
		78%,
		96% {
			transform: none;
		}
		96.1%,
		100% {
			transform: scaleY(0);
		}
	}

	@keyframes ball {
		0%,
		17% {
			opacity: 0;
			transform: scale(0.8);
		}
		18% {
			opacity: 1;
			transform: scale(1.1);
			animation-timing-function: ease-in;
		}
		28% {
			transform: translateY(44px) rotate(-60deg);
			animation-timing-function: ease-out;
		}
		31% {
			transform: translateY(38px) rotate(-68deg);
			animation-timing-function: ease-in;
		}
		34%,
		62% {
			opacity: 1;
			transform: translateY(44px) rotate(-75deg);
		}
		65% {
			opacity: 1;
			transform: none;
		}
		65.1%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	@keyframes envelope {
		0%,
		68% {
			opacity: 0;
			transform: translateY(110px);
			animation-timing-function: ease-out;
		}
		76%,
		92% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in;
		}
		96% {
			opacity: 1;
			transform: translateX(-200px);
		}
		97%,
		100% {
			opacity: 0;
			transform: translateX(-200px);
		}
	}
</style>
