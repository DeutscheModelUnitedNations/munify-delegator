<script lang="ts">
	import { onMount } from 'svelte';

	interface Particle {
		x: number;
		y: number;
		color: string;
		delay: number;
		size: number;
	}

	let particles = $state<Particle[]>([]);

	onMount(() => {
		const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
		particles = Array.from({ length: 30 }, () => ({
			x: Math.random() * 100,
			y: Math.random() * 100,
			color: colors[Math.floor(Math.random() * colors.length)],
			delay: Math.random() * 0.5,
			size: 6 + Math.random() * 8
		}));
	});
</script>

<div class="celebration-container absolute inset-0 overflow-hidden pointer-events-none">
	{#each particles as particle}
		<div
			class="particle"
			style="
				left: {particle.x}%;
				top: {particle.y}%;
				background: {particle.color};
				animation-delay: {particle.delay}s;
				width: {particle.size}px;
				height: {particle.size}px;
			"
		></div>
	{/each}
</div>

<style>
	.particle {
		position: absolute;
		border-radius: 50%;
		animation: celebrate 1.5s ease-out forwards;
	}

	@keyframes celebrate {
		0% {
			transform: translateY(0) scale(0) rotate(0deg);
			opacity: 1;
		}
		50% {
			transform: translateY(-80px) scale(1) rotate(180deg);
			opacity: 1;
		}
		100% {
			transform: translateY(-150px) scale(0.5) rotate(360deg);
			opacity: 0;
		}
	}
</style>
