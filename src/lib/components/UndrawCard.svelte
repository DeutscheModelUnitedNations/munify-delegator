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
	class="card bg-base-100 dark:bg-base-200 w-full max-w-96 shadow-lg hover:scale-[1.01] transition-all duration-300"
>
	<figure
		class="bg-base-200 dark:bg-base-content flex justify-center items-center p-6 h-60 relative"
	>
		<img src={img} alt="Illustration" class="w-full h-full {disabled && 'blur-sm'}" />
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
		<div class="card-actions justify-end mt-4">
			{#if !disabled}
				<a class="btn btn-primary" href={btnLink}>{btnText}</a>
			{:else}
				<button class="btn" disabled>{btnText}</button>
			{/if}
		</div>
	</div>
</div>
