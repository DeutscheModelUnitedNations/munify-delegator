<!-- Holes, writing, stains and stickers cover the marks and the code; a clean page is read. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const CORNERS = [
		[8, 8],
		[62, 8],
		[8, 91],
		[62, 91]
	];
</script>

<Scene>
	<g transform="translate(68 30) scale(1.6)">
		<Sheet>
			<g class="mess">
				<circle cx="8" cy="8" r="6" class="hole first" />
				<circle cx="8" cy="91" r="6" class="hole second" />
				<path d="M24 18q8-6 6 4t8 2-4 8 8-12 4 10-12 4 6-14 8 8" pathLength="1" class="doodle" />
				<path d="M62 78a15 15 0 1 1-2 22" pathLength="1" class="coffee" />
				<g class="note">
					<rect x="36" y="50" width="30" height="28" class="sticky" />
					<path d="M41 58h18M41 64h20M41 70h10" class="scribble" />
				</g>
			</g>
			<g class="found">
				{#each CORNERS as [cx, cy] (`${cx},${cy}`)}
					<rect x={cx - 6} y={cy - 6} width="12" height="12" rx="2" class="frame" />
				{/each}
				<rect x="25" y="13" width="20" height="20" rx="2" class="frame" />
			</g>
			<g class="beam">
				<rect x="-6" width="82" height="3" rx="1.5" class="light" />
				<rect x="-6" y="-14" width="82" height="14" class="light glow" />
			</g>
		</Sheet>
	</g>
	<Scanner />
	<Strike x={122} y={113} size={1.1} />
	<Check x={206} y={56} />
</Scene>

<style>
	.hole {
		fill: var(--color-base-300);
		stroke: var(--paper-edge);
	}

	.hole.first {
		animation: hole var(--scene) infinite both;
	}

	.hole.second {
		animation: second-hole var(--scene) infinite both;
	}

	.doodle {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-dasharray: 1;
		animation: doodle var(--scene) infinite both;
	}

	.coffee {
		fill: none;
		stroke: #8a5a2b;
		stroke-width: 4;
		stroke-linecap: round;
		opacity: 0.7;
		stroke-dasharray: 1;
		animation: coffee var(--scene) infinite both;
	}

	.sticky {
		fill: #ffe27a;
	}

	.scribble {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.6;
	}

	.note {
		animation: note var(--scene) infinite both;
	}

	.mess {
		animation: mess var(--scene) infinite both;
	}

	.frame {
		fill: var(--color-success);
		fill-opacity: 0.2;
		stroke: var(--color-success);
		stroke-width: 2.4;
	}

	.found {
		animation: found var(--scene) infinite both;
	}

	.light {
		fill: var(--color-success);
	}

	.glow {
		opacity: 0.2;
	}

	.beam {
		animation: beam var(--scene) infinite both;
	}

	@keyframes hole {
		0%,
		4% {
			opacity: 0;
			transform: scale(2.5);
		}
		7%,
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes second-hole {
		0%,
		9% {
			opacity: 0;
			transform: scale(2.5);
		}
		12%,
		100% {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes doodle {
		0%,
		14% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		14.1% {
			opacity: 1;
			stroke-dashoffset: 1;
		}
		24%,
		100% {
			opacity: 1;
			stroke-dashoffset: 0;
		}
	}

	@keyframes coffee {
		0%,
		25% {
			opacity: 0;
			stroke-dashoffset: 1;
		}
		25.1% {
			opacity: 0.7;
			stroke-dashoffset: 1;
		}
		31%,
		100% {
			opacity: 0.7;
			stroke-dashoffset: 0;
		}
	}

	@keyframes note {
		0%,
		30% {
			opacity: 0;
			transform: translate(40px, -60px) rotate(50deg);
		}
		37%,
		100% {
			opacity: 1;
			transform: rotate(-7deg);
		}
	}

	@keyframes mess {
		0%,
		62% {
			opacity: 1;
		}
		66%,
		100% {
			opacity: 0;
		}
	}

	@keyframes beam {
		0%,
		67% {
			opacity: 0;
			transform: translateY(0);
		}
		68% {
			opacity: 1;
			transform: translateY(0);
		}
		79% {
			opacity: 1;
			transform: translateY(96px);
		}
		82%,
		100% {
			opacity: 0;
			transform: translateY(96px);
		}
	}

	@keyframes found {
		0%,
		72% {
			opacity: 0;
			transform: scale(1.1);
		}
		79% {
			opacity: 1;
			transform: scale(0.97);
		}
		82%,
		92% {
			opacity: 1;
			transform: none;
		}
		97%,
		100% {
			opacity: 0;
			transform: none;
		}
	}
</style>
