<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent, BubbleMenu } from 'svelte-tiptap';
	import { editorContentStore } from './editorStore';
	import { m } from '$lib/paraglide/messages';
	import type { EditorOptions } from '@tiptap/core';

	interface Props {
		settings: Partial<EditorOptions>;
		editable?: boolean;
		fixedMenu?: Snippet<[Editor]>;
		bubbleMenu?: Snippet<[Editor]>;
		baseContent?: EditorOptions['content'];
		additionalClasses?: string;
		onQuoteSelection?: (text: string) => void;
	}

	let {
		settings,
		editable = true,
		fixedMenu,
		bubbleMenu,
		baseContent,
		additionalClasses = 'prose prose-sm',
		onQuoteSelection
	}: Props = $props();

	const handleQuoteClick = () => {
		if ($editor && onQuoteSelection) {
			const { from, to } = $editor.state.selection;
			const selectedText = $editor.state.doc.textBetween(from, to, ' ');
			if (selectedText.trim()) {
				onQuoteSelection(selectedText.trim());
			}
		}
	};

	// Custom shouldShow for quote bubble menu - works even in read-only mode
	const shouldShowQuoteBubble = ({ state }: { state: any }) => {
		const { from, to } = state.selection;
		// Show only when there's actual text selected (not just cursor)
		return from !== to;
	};

	let editor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			...settings,
			content: $editorContentStore ?? baseContent ?? undefined,
			editorProps: {
				attributes: {
					class: `${additionalClasses} focus:outline-none px-2 pb-2`
				}
			},
			onUpdate: ({ editor }) => {
				$editorContentStore = editor.getJSON();
			},
			editable
		});
	});
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 min-h-[300px]">
	<legend class="fieldset-legend">{editable ? m.editor() : m.viewer()}</legend>

	{#if $editor && editable}
		{@render fixedMenu?.($editor)}
	{/if}

	<EditorContent editor={$editor} />

	{#if $editor && editable}
		<BubbleMenu editor={$editor}>
			{@render bubbleMenu?.($editor)}
		</BubbleMenu>
	{/if}

	{#if $editor && !editable && onQuoteSelection}
		<BubbleMenu editor={$editor} shouldShow={shouldShowQuoteBubble}>
			<button
				class="btn btn-sm btn-primary shadow-lg"
				onclick={handleQuoteClick}
				title={m.quoteInReview()}
			>
				<i class="fa-solid fa-quote-left"></i>
				{m.quote()}
			</button>
		</BubbleMenu>
	{/if}
</fieldset>
