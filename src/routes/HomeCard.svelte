<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';

	interface Props {
		src: string;
		header: string;
		btnText?: string;
		btnLink?: ResolvedPathname;
		children?: Snippet;
	}

	let { src, header, btnText, btnLink, children }: Props = $props();
</script>

<div
	class="card border-base-300 bg-base-100 group h-full gap-4 border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-8"
>
	<img
		{src}
		alt=""
		class="mb-2 h-28 w-full object-contain transition-transform duration-500 group-hover:scale-105 md:mb-4 md:h-40"
	/>
	<h3 class="text-primary text-xl leading-none font-light">{header}</h3>
	<div class="flex flex-1 flex-col gap-2 text-[15px] leading-[1.3]">
		{#if children}
			{@render children()}
		{/if}
	</div>
	{#if btnText && btnLink}
		<div class="card-actions">
			<a class="btn btn-primary" href={btnLink}>{btnText}</a>
		</div>
	{/if}
</div>
