<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	import { m } from '#lib/paraglide/messages';
	import { getFlowInteraction } from './flowInteraction';

	/**
	 * One step of the application form, on a line down the page: open while it is the step being
	 * worked on, folded to a summary of what was chosen once it is done.
	 */
	interface Props {
		number: number;
		title: string;
		description?: string;
		/** Set once the step is done: what was chosen, shown instead of the step's content. */
		summary?: string;
		/** Reopens a done step. */
		onEdit?: () => void;
		/** The last step draws no line on to a next one. */
		last?: boolean;
		/** Without a card around it, for a step whose content brings its own cards. */
		bare?: boolean;
		/**
		 * Scrolls the step into view when the person's input in the step above opens it; never for a
		 * step that is open when the page loads.
		 */
		scrollIntoView?: boolean;
		children: Snippet;
	}

	let {
		number,
		title,
		description,
		summary,
		onEdit,
		last = false,
		bare = false,
		scrollIntoView = false,
		children
	}: Props = $props();

	const done = $derived(summary !== undefined);

	const interaction = getFlowInteraction();

	let step = $state<HTMLElement>();

	// Once the step has opened to its full height, and only as far as needed to show it.
	function reveal() {
		if (scrollIntoView && interaction?.started) {
			step?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}
</script>

<li class="flex scroll-mt-24 gap-3 sm:gap-4" bind:this={step} in:fade={{ duration: 300 }}>
	<div class="flex flex-col items-center">
		<span
			class="flex size-9 shrink-0 items-center justify-center rounded-full font-semibold shadow-sm transition-colors duration-500 {done
				? 'bg-success text-success-content'
				: 'bg-primary text-primary-content ring-primary/20 ring-4'}"
		>
			{#if done}
				<i class="fa-solid fa-check" in:scale={{ duration: 400, easing: backOut }}></i>
			{:else}
				<span in:scale={{ duration: 300 }}>{number}</span>
			{/if}
		</span>
		{#if !last}
			<span
				class="mt-2 w-0.5 flex-1 rounded-full transition-colors duration-500 {done
					? 'bg-success/60'
					: 'bg-base-300'}"
			></span>
		{/if}
	</div>

	<section
		class="mb-6 min-w-0 flex-1 {bare
			? ''
			: `card bg-base-100 border-base-200 border shadow-sm transition-shadow duration-300 ${done ? '' : 'shadow-md'}`}"
	>
		<div class={bare ? 'pt-1' : 'card-body gap-0 max-sm:p-4'}>
			<div class="flex items-start gap-4">
				<div class="min-w-0 flex-1">
					<h2 class="card-title text-lg">{title}</h2>
					{#if done}
						<p class="text-base-content/70 mt-1 text-sm" in:fly={{ y: -6, duration: 250 }}>
							{summary}
						</p>
					{:else if description}
						<p class="text-base-content/60 mt-1 text-sm">{description}</p>
					{/if}
				</div>
				{#if done && onEdit}
					<button class="btn btn-ghost btn-sm" type="button" onclick={onEdit}>
						<i class="fa-sharp-duotone fa-solid fa-pen"></i>
						<span class="max-sm:hidden">{m.edit()}</span>
					</button>
				{/if}
			</div>
			{#if !done}
				<div
					class="flex flex-col pt-4"
					onintroend={reveal}
					transition:slide|global={{ duration: 350, easing: cubicOut }}
				>
					{@render children()}
				</div>
			{/if}
		</div>
	</section>
</li>
