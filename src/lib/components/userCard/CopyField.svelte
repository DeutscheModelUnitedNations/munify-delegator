<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';

	/**
	 * A form field with a copy button beside it, for reading a person's details off the card. The
	 * button shows only while the field is not being edited and has something to copy.
	 */
	interface Props {
		/** What is copied: the text the field shows, not a stored code */
		value: string | null | undefined;
		show: boolean;
		children: Snippet;
	}

	let { value, show, children }: Props = $props();

	let wrapper = $state<HTMLDivElement>();
	// Where the field's input is centered, from the top of the wrapper. A label above it and the
	// error line below it make the field taller than its input, so the button is placed on the
	// input itself rather than on the middle of the whole field.
	let inputCenter = $state<number>();

	$effect(() => {
		const element = wrapper;
		if (!element || !show) return;
		const measure = () => {
			const input = element.querySelector<HTMLElement>(
				'input:not([type=hidden]), select, textarea, [role=group], [role=combobox]'
			);
			const box = (input ?? element).getBoundingClientRect();
			inputCenter = box.top - element.getBoundingClientRect().top + box.height / 2;
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	});

	const copy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		toast.success(m.codeCopied());
	};
</script>

<div class="relative flex gap-1" bind:this={wrapper}>
	<div class="min-w-0 flex-1">{@render children()}</div>
	{#if show && value}
		{@const text = value}
		<!-- Keeps the room the button takes, which sits on the input's middle -->
		<div class="w-8 shrink-0"></div>
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square absolute right-0 -translate-y-1/2"
			style:top={inputCenter === undefined ? '50%' : `${inputCenter}px`}
			aria-label={m.copy()}
			title={m.copy()}
			onclick={() => copy(text)}
		>
			<i class="fa-sharp-duotone fa-solid fa-copy"></i>
		</button>
	{/if}
</div>
