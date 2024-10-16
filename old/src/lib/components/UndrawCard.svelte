<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		title: string;
		img: string;
		btnText: string;
		btnLink: string;
		disabled?: boolean;
		children: Snippet;
	}

	let { title, img, btnText, btnLink, disabled, children }: Props = $props();
</script>

<div
	class="card w-full max-w-96 bg-base-100 shadow-lg transition-all duration-300 hover:scale-[1.01] dark:bg-base-200"
>
	<figure
		class="relative flex h-60 items-center justify-center bg-base-200 p-6 dark:bg-base-content"
	>
		<img src={img} alt="Illustration" class="h-full w-full {disabled && 'blur-sm'}" />
		{#if disabled}
			<div class="absolute flex items-center justify-center">
				<div class="badge badge-lg">{m.RegistrationNotPossible()}</div>
			</div>
		{/if}
	</figure>
	<div class="card-body">
		<h2 class="card-title">{title}</h2>
		<div class="flex-1">
			{@render children()}
		</div>
		<div class="card-actions mt-4 justify-end">
			{#if !disabled}
				<a class="btn btn-primary" href={btnLink}>{btnText}</a>
			{:else}
				<button class="btn" disabled>{btnText}</button>
			{/if}
		</div>
	</div>
</div>
