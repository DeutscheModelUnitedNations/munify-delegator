<!-- Cash, a payment app or a cheque cannot be matched; a transfer can. -->
<script lang="ts">
	import Check from '#lib/components/postalGuide/scenes/Check.svelte';
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import Strike from '#lib/components/postalGuide/scenes/Strike.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import Phone from './Phone.svelte';
</script>

<Scene>
	<g class="others">
		<g class="item cash" style:--at={0.03}>
			<rect x="34" y="84" width="64" height="34" rx="3" class="note" />
			<rect x="38" y="88" width="56" height="26" rx="2" class="note-inner" />
			<circle cx="66" cy="101" r="8" class="note-inner" />
		</g>
		<g class="item" style:--at={0.09}>
			<rect x="106" y="84" width="64" height="34" rx="3" class="cheque" />
			<path d="M112 94h30M112 102h22" class="line" />
			<path d="M140 110q4-6 8 0t8 0 6-3" class="line" />
		</g>
		<g class="item" style:--at={0.15}>
			<rect x="180" y="72" width="30" height="54" rx="6" class="app" />
			<rect x="184" y="80" width="22" height="38" rx="2" class="app-screen" />
			<path
				d="M191 92a6 6 0 0 1 0 10M195 89a10 10 0 0 1 0 16M199 86a14 14 0 0 1 0 22"
				class="waves"
			/>
		</g>
	</g>
	<g class="phone"><Phone /></g>
	<Coin flight="right" />
	<AccountDisplay />
	<Strike x={124} y={101} size={1.4} />
	<Check x={164} y={104} />
</Scene>

<style>
	.note {
		fill: #5fa36a;
	}

	.note-inner {
		fill: none;
		stroke: #2f6b3a;
		stroke-width: 1.5;
	}

	.cheque {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.5;
	}

	.line {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
		stroke-linecap: round;
		opacity: 0.6;
	}

	.app {
		fill: #475467;
	}

	.app-screen {
		fill: #7c5cff;
	}

	.waves {
		fill: none;
		stroke: white;
		stroke-width: 2;
		stroke-linecap: round;
	}

	.item {
		animation: appear var(--scene) calc(var(--scene) * var(--at)) infinite both;
	}

	.others {
		animation: refused var(--scene) infinite both;
	}

	.phone {
		animation: phone var(--scene) infinite both;
	}

	/* One after the other; gone once struck through */
	@keyframes appear {
		0% {
			opacity: 0;
			transform: scale(0.4);
		}
		3% {
			opacity: 1;
			transform: scale(1.1);
		}
		5%,
		100% {
			opacity: 1;
			transform: none;
		}
	}

	/* Pushed towards the bank, which takes none of it */
	@keyframes refused {
		0%,
		22% {
			opacity: 1;
			transform: none;
		}
		28% {
			transform: translateX(34px);
		}
		34%,
		61% {
			opacity: 1;
			transform: none;
		}
		64%,
		100% {
			opacity: 0;
			transform: none;
		}
	}

	@keyframes phone {
		0%,
		62% {
			opacity: 0;
			transform: translateY(230px);
		}
		64% {
			opacity: 1;
			transform: translateY(230px);
			animation-timing-function: ease-out;
		}
		70%,
		93% {
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
