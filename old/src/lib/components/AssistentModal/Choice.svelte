<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		caption?: string;
		choices: {
			icon: string;
			title: string;
			class?: string;
			onClick?: () => void;
			href?: string;
		}[];
		delay?: number;
	}

	let { caption, choices, delay = 0 }: Props = $props();

	let randId: string = $state<string>(Math.random().toString(36).substring(7));

	onMount(() => {
		setTimeout(() => {
			const chat = document.getElementById(randId);
			if (chat) {
				chat.scrollIntoView({ behavior: 'smooth', block: 'end' });
			}
		}, delay);
	});
</script>

<div id={randId} class="flex w-full flex-col gap-2 py-6" in:fly={{ y: 10, duration: 300, delay }}>
	{#if caption}
		<h3 class="w-full text-center text-sm uppercase tracking-wider">
			{caption}
		</h3>
	{/if}

	{#each choices as btn}
		{#if btn.href}
			<a class="btn w-full {btn.class ?? ''}" href={btn.href}>
				{#if btn.icon}
					<i class={`fa-solid fa-${btn.icon} w-5`}></i>
				{/if}
				<div>{btn.title}</div>
			</a>
		{:else}
			<button
				class="btn w-full {btn.class ?? ''}"
				onclick={() => {
					if (btn.onClick) {
						btn.onClick();
					} else {
						console.warn('No onClick handler provided');
					}
				}}
			>
				{#if btn.icon}
					<i class={`fa-solid fa-${btn.icon} w-5`}></i>
				{/if}
				<div>{btn.title}</div>
			</button>
		{/if}
	{/each}
</div>
