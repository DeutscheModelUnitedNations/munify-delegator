<!-- The printer prints everything, and then the terms with their Roman page numbers are left out. -->
<script lang="ts">
	import Check from './Check.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';
	import Strike from './Strike.svelte';

	const PAGES = [
		{ name: 'first', number: '1' },
		{ name: 'second', number: '2' },
		{ name: 'third', number: 'I' },
		{ name: 'fourth', number: 'II' }
	];
</script>

<Scene>
	{#each PAGES as { name, number } (name)}
		<g transform="translate(50 106) scale(0.8)">
			<g class={name}><Sheet {number} signed={false} /></g>
		</g>
	{/each}
	<path d="M44 104V66h64v38Z" class="stock" />
	<path d="M36 104l6 -22h68l6 22Z" class="tray" />
	<rect x="18" y="100" width="116" height="92" rx="9" class="case" />
	<rect x="126" y="112" width="10" height="72" rx="4" class="slot" />
	<rect x="32" y="114" width="44" height="22" rx="4" class="slot" />
	<circle cx="92" cy="125" r="5" class="light" />
	<rect x="32" y="152" width="78" height="5" rx="2.5" class="slot" />
	<Strike x={333} y={144} />
	<Check x={352} y={145} />
</Scene>

<style>
	.case {
		fill: #667085;
	}

	.tray,
	.slot {
		fill: #475467;
	}

	.stock {
		fill: var(--paper);
		stroke: var(--paper-edge);
	}

	.light {
		fill: #5fd38d;
	}

	.first {
		animation: first var(--scene) ease-out infinite both;
	}

	.second {
		animation: second var(--scene) ease-out infinite both;
	}

	.third {
		animation: third var(--scene) ease-out infinite both;
	}

	.fourth {
		animation: fourth var(--scene) ease-out infinite both;
	}

	/* Out of the printer, next to each other, then to the middle */
	@keyframes first {
		0%,
		4% {
			opacity: 1;
			transform: none;
		}
		10%,
		65% {
			transform: translateX(122px);
		}
		74%,
		92% {
			opacity: 1;
			transform: translateX(150px);
			animation-timing-function: ease-in;
		}
		97% {
			opacity: 0;
			transform: translate(150px, 70px);
		}
		97.1%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	@keyframes second {
		0%,
		12% {
			opacity: 1;
			transform: none;
		}
		19%,
		65% {
			transform: translateX(200px);
		}
		74%,
		92% {
			opacity: 1;
			transform: translateX(250px);
			animation-timing-function: ease-in;
		}
		97% {
			opacity: 0;
			transform: translate(250px, 70px);
		}
		97.1%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	/* The terms, which drop out */
	@keyframes third {
		0%,
		20% {
			opacity: 1;
			transform: none;
		}
		28%,
		62% {
			opacity: 1;
			transform: translateX(278px);
			animation-timing-function: ease-in;
		}
		68%,
		100% {
			opacity: 0;
			transform: translate(270px, 100px) rotate(-30deg);
		}
	}

	@keyframes fourth {
		0%,
		29% {
			opacity: 1;
			transform: none;
		}
		37%,
		62% {
			opacity: 1;
			transform: translateX(356px);
			animation-timing-function: ease-in;
		}
		68%,
		100% {
			opacity: 0;
			transform: translate(370px, 100px) rotate(30deg);
		}
	}
</style>
