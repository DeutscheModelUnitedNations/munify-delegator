<script lang="ts">
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
</script>

<div class="w-full flex flex-col gap-2 mt-6" in:fly={{ y: 10, duration: 300, delay }}>
	{#if caption}
		<h3 class="text-sm text-center w-full uppercase tracking-wider">
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
						console.log('No onClick handler provided');
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
