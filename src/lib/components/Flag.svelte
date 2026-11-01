<script lang="ts">
	import { onMount } from 'svelte';
	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg';
		alpha2Code?: string;
		nsa?: boolean;
		icon?: string | null;
	}

	let { size = 'md', alpha2Code, nsa = false, icon }: Props = $props();

	const flagClasses = {
		xs: 'w-[2rem] h-[1.5rem] rounded-field',
		sm: 'w-[4rem] h-[3rem] rounded-box',
		md: 'w-[6rem] h-[4.5rem] rounded-box',
		lg: 'w-[8rem] h-[6rem] rounded-box'
	} satisfies Record<NonNullable<Props['size']>, string>;

	const iconClasses = {
		xs: 'text-base',
		sm: 'text-lg',
		md: 'text-2xl',
		lg: 'text-5xl'
	} satisfies Record<NonNullable<Props['size']>, string>;

	const flagClassNames = () => flagClasses[size];
	const iconClassNames = () => iconClasses[size];

	onMount(() => {
		if (!alpha2Code && !nsa) {
			throw new Error('No alpha2Code or NSA-Flag provided');
		}
	});
</script>

<div
	class="{flagClassNames()} flex shrink-0 items-center justify-center overflow-hidden shadow {nsa &&
		'bg-base-300'}"
>
	{#if nsa}
		<i
			class="fa-sharp-duotone fa-solid fa-{(icon ?? 'fa-hand-point-up').replace(
				'fa-',
				''
			)} {iconClassNames()}"
		></i>
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
