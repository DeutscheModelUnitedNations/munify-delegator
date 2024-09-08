<script lang="ts">
	import { Alpha3 } from 'convert-iso-codes';
	import { onMount } from 'svelte';
	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg';
		alpha2Code?: string;
		nsa?: boolean;
	}

	let { size = 'md', alpha2Code, nsa = false }: Props = $props();

	const flagClassNames = () => {
		switch (size) {
			case 'xs':
				return 'w-[2rem] h-[1.5rem] rounded';
			case 'sm':
				return 'w-[4rem] h-[3rem] rounded-lg';
			case 'md':
				return 'w-[6rem] h-[4.5rem] rounded-lg';
			case 'lg':
				return 'w-[8rem] h-[6rem] rounded-lg';
		}
	};

	onMount(() => {
		if (!alpha2Code && !nsa) {
			throw new Error('No alpha2Code or NSA-Flag provided');
		}
	});
</script>

<div
	class="{flagClassNames()} overflow-hidden shadow flex justify-center items-center {nsa &&
		'bg-error'}"
>
	{#if nsa}
		<i class="fa-solid fa-hand-point-up"></i>
	{:else}
		<span class="fi fi-{alpha2Code}"></span>
	{/if}
</div>

<style>
	.fi {
		width: 100% !important;
		line-height: 100rem !important;
	}
</style>
