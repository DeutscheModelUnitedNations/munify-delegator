<!--
	@component
	One section of the message service's terms in `MessagingTermsChecklist`: a disclosure whose
	button shows the title and the gist, opening to the full text and, while the reader is asked to
	agree, the "Understood" button that confirms it.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		section: {
			icon: string;
			title: string;
			summary: string;
			paragraphs: string[];
			callout: string | null;
		};
		/** Its place in the list, counting from 1. */
		number: number;
		/** Whether the reader is asked to agree, so the section can be confirmed. */
		asking: boolean;
		done: boolean;
		open: boolean;
		panelId: string;
		/** The disclosure's button, which the checklist focuses when it opens this section next. */
		header?: HTMLButtonElement;
		ontoggle: () => void;
		onunderstood: () => void;
	}

	let {
		section,
		number,
		asking,
		done,
		open,
		panelId,
		header = $bindable(),
		ontoggle,
		onunderstood
	}: Props = $props();

	const frame = $derived(
		open
			? 'border-primary/40 bg-base-200'
			: done
				? 'border-success/25 bg-success/5'
				: 'border-base-content/10 bg-base-200/40 hover:bg-base-200'
	);
</script>

<li class="rounded-box border transition-colors {frame}" data-testid="chat-terms-section">
	<h3>
		<button
			type="button"
			class="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
			aria-expanded={open}
			aria-controls={panelId}
			bind:this={header}
			onclick={ontoggle}
		>
			{#if asking && done}
				<span
					class="bg-success text-success-content flex size-8 shrink-0 items-center justify-center rounded-full"
				>
					<i aria-hidden="true" class="ph-duotone ph-check"></i>
					<span class="sr-only">{m.chatTermsUnderstood()}:</span>
				</span>
			{:else}
				<span
					class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full"
				>
					<i aria-hidden="true" class="ph-duotone ph-{section.icon} text-lg"></i>
					<span class="sr-only">{number}.</span>
				</span>
			{/if}
			<span class="flex grow flex-col gap-0.5">
				<span class="font-semibold">{section.title}</span>
				<span class="text-base-content/70 text-sm">{section.summary}</span>
			</span>
			<i
				aria-hidden="true"
				class="ph-duotone ph-caret-down text-base-content/60 shrink-0 transition-transform"
				class:rotate-180={open}
			></i>
		</button>
	</h3>
	<div id={panelId} hidden={!open} class="flex flex-col gap-3 px-4 pb-4 sm:pl-15">
		{#each section.paragraphs as paragraph, index (index)}
			<p class="text-base-content/80 text-sm leading-relaxed">{paragraph}</p>
		{/each}
		{#if section.callout}
			<div
				role="note"
				class="border-warning/50 bg-warning/10 rounded-box flex items-start gap-3 border p-3 text-sm font-medium"
			>
				<i aria-hidden="true" class="ph-duotone ph-warning text-warning text-xl"></i>
				<p>{section.callout}</p>
			</div>
		{/if}
		{#if asking}
			<button
				type="button"
				class="btn btn-primary self-start"
				onclick={onunderstood}
				data-testid="chat-terms-understood"
			>
				<i aria-hidden="true" class="ph-duotone ph-check"></i>
				{m.chatTermsUnderstood()}
			</button>
		{/if}
	</div>
</li>
