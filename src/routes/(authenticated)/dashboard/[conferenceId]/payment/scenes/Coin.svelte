<!--
	@component
	The money of a transfer, a coin flying from the phone's send button (106 174) into the account's
	screen (324 166): with the wrong transfer at 20 to 36 % of the scene, with the right one at 72 to
	82 %. A scene moves it elsewhere by wrapping it.
-->
<g transform="translate(106 174)">
	<g class="coin">
		<circle r="13" class="face" />
		<circle r="9.5" class="rim" />
		<path d="M3 -2.9A4 4 0 1 0 3 2.9M-4.6 -1.1h5M-4.6 1.3h5" class="mark" />
	</g>
</g>

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

	.coin {
		animation: fly var(--scene) infinite both;
	}

	/* Up out of the phone, over in an arc, and into the screen */
	@keyframes fly {
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
		72% {
			opacity: 0;
			transform: translate(218px, -8px) scale(0);
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
</style>
