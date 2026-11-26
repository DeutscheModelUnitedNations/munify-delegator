<!-- Whoever sends the money, the reference matches it. -->
<script lang="ts">
	import Scene from '#lib/components/postalGuide/scenes/Scene.svelte';
	import AccountDisplay from './AccountDisplay.svelte';
	import Coin from './Coin.svelte';
	import ReferenceCode from './ReferenceCode.svelte';

	/** The participant, a parent and the school, one after the other. */
	const SENDERS = [
		{ y: 52, tone: 'primary' },
		{ y: 110, tone: 'parent' },
		{ y: 168, tone: 'school' }
	];
</script>

<Scene>
	{#each SENDERS as sender, index (sender.y)}
		<g transform="translate(46 {sender.y})" class={sender.tone}>
			<circle cy="-8" r="9" class="person" />
			<path d="M-15 20q0-16 15-16t15 16Z" class="person" />
			<rect x="24" y="-6" width="76" height="16" rx="3" class="tag" />
			<ReferenceCode x={62} y={5} />
		</g>
		<g class="sent" style:--start={index / SENDERS.length} style:--dy="{166 - sender.y}px">
			<Coin flight="none" x={160} y={sender.y} size={0.8} />
		</g>
	{/each}
	<AccountDisplay runs="well" />
</Scene>

<style>
	.primary {
		--tone: var(--color-primary);
	}

	/* Fixed like the coin's, so the three stay apart in every theme */
	.parent {
		--tone: #e07a5f;
	}

	.school {
		--tone: #3d9a8b;
	}

	.person {
		fill: var(--tone);
	}

	.tag {
		fill: var(--paper);
		stroke: var(--paper-edge);
		stroke-width: 1.5;
	}

	/* One after the other, a coin every third of the loop */
	.sent {
		animation: sent var(--scene) calc(var(--scene) * var(--start)) infinite both;
	}

	@keyframes sent {
		0% {
			opacity: 0;
			transform: none;
		}
		3% {
			opacity: 1;
			transform: none;
			animation-timing-function: ease-in-out;
		}
		22% {
			opacity: 1;
			transform: translate(164px, var(--dy)) scale(0.6);
		}
		24%,
		100% {
			opacity: 0;
			transform: translate(164px, var(--dy)) scale(0);
		}
	}
</style>
