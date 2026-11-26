<!--
	@component
	A phone at the left of the stage with a banking app's transfer: IBAN (text at 74 70), amount
	(74 96) and purpose (field 70 to 142, 112 to 128), room for one more row (70 to 142, 136 to
	156) and the send button at (106 174). A scene replaces what a field shows; texts it draws in
	`iban` and `amount` look like the app's.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import ReferenceCode from './ReferenceCode.svelte';

	interface Props {
		iban?: Snippet;
		amount?: Snippet;
		purpose?: Snippet;
		/** Below the purpose. */
		extra?: Snippet;
		/** The send button is pressed when the wrong and when the right transfer is sent. */
		presses?: boolean;
	}

	let { iban, amount, purpose, extra, presses = true }: Props = $props();
</script>

<rect x="56" y="22" width="100" height="182" rx="16" class="case" />
<rect x="62" y="30" width="88" height="166" rx="10" class="screen" />
<path d="M62 40a10 10 0 0 1 10-10h68a10 10 0 0 1 10 10v6H62Z" class="header" />

<rect x="70" y="54" width="22" height="3" rx="1.5" class="label" />
<rect x="70" y="60" width="72" height="14" rx="3" class="field" />
<g class="value">
	{#if iban}{@render iban()}{:else}<text x="74" y="70">DE89 3704 …</text>{/if}
</g>

<rect x="70" y="80" width="26" height="3" rx="1.5" class="label" />
<rect x="70" y="86" width="72" height="14" rx="3" class="field" />
<g class="value">
	{#if amount}{@render amount()}{:else}<text x="74" y="96">€ 85</text>{/if}
</g>

<rect x="70" y="106" width="34" height="3" rx="1.5" class="label" />
<rect x="70" y="112" width="72" height="16" rx="3" class="field purpose" />
{#if purpose}
	{@render purpose()}
{:else}
	<ReferenceCode x={106} y={123} />
{/if}
{@render extra?.()}

<g class:send={presses}>
	<rect x="74" y="166" width="64" height="16" rx="8" class="button" />
	<path d="M100 174h12m-4-4 4 4-4 4" class="arrow" />
</g>

<style>
	.case {
		fill: #475467;
	}

	.screen {
		fill: var(--paper);
	}

	.header,
	.button {
		fill: var(--color-primary);
	}

	.label {
		fill: var(--paper-edge);
	}

	.field {
		fill: none;
		stroke: var(--paper-edge);
		stroke-width: 1.5;
	}

	.purpose {
		stroke: var(--color-primary);
	}

	.value :global(text) {
		font-family: ui-monospace, monospace;
		font-size: 8px;
		fill: var(--ink);
	}

	.arrow {
		fill: none;
		stroke: var(--color-primary-content);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.send {
		animation: press var(--scene) infinite both;
	}

	@keyframes press {
		0%,
		17%,
		23%,
		70%,
		76%,
		100% {
			transform: none;
		}
		19%,
		72% {
			transform: scale(0.9);
		}
	}
</style>
