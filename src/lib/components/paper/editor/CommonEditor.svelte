<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, Editor, EditorContent, BubbleMenu } from 'svelte-tiptap';
	import { editorContentStore } from './editorStore';
	import { paperStatsStore, type PaperStats } from './paperStatsStore';
	import { m } from '$lib/paraglide/messages';
	import type { EditorOptions, Editor as CoreEditor } from '@tiptap/core';

	interface Props {
		settings: Partial<EditorOptions>;
		editable?: boolean;
		fixedMenu?: Snippet<[Editor]>;
		bubbleMenu?: Snippet<[Editor]>;
		baseContent?: EditorOptions['content'];
		additionalClasses?: string;
		onQuoteSelection?: (text: string) => void;
		showStats?: boolean;
	}

	let {
		settings,
		editable = true,
		fixedMenu,
		bubbleMenu,
		baseContent,
		additionalClasses = 'prose prose-sm',
		onQuoteSelection,
		showStats = false
	}: Props = $props();

	// Local stats state for display
	let stats = $state<PaperStats>({
		words: 0,
		characters: 0,
		paragraphs: 0,
		readingTimeMinutes: 0
	});

	const calculateStats = (editor: CoreEditor) => {
		const words = editor.storage.characterCount?.words() ?? 0;
		const characters = editor.storage.characterCount?.characters() ?? 0;

		// Count paragraph nodes
		let paragraphs = 0;
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'paragraph' && node.textContent.trim().length > 0) {
				paragraphs++;
			}
		});

		// Calculate reading time (~200 words per minute)
		const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

		const newStats = { words, characters, paragraphs, readingTimeMinutes };
		stats = newStats;
		paperStatsStore.set(newStats);
	};

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

	let editor = $state<Readable<Editor> | null>(null);
	let isDestroyed = $state(false);

	onMount(() => {
		editor = createEditor({
			...settings,
			content: $editorContentStore ?? baseContent ?? undefined,
			editorProps: {
				attributes: {
					class: `${additionalClasses} focus:outline-none px-2 pb-2`
				}
			},
			onUpdate: ({ editor: e }) => {
				if (isDestroyed) return;
				$editorContentStore = e.getJSON();
				if (showStats) {
					calculateStats(e);
				}
			},
			onCreate: ({ editor: e }) => {
				// Calculate initial stats on editor creation (for both edit and view mode)
				if (showStats) {
					calculateStats(e);
				}
			},
			editable
		});
	});

	onDestroy(() => {
		isDestroyed = true;
		if (editor) {
			const e = $editor;
			if (e && !e.isDestroyed) {
				e.destroy();
			}
		}
	});
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 min-h-[300px]">
	<legend class="fieldset-legend">{editable ? m.editor() : m.viewer()}</legend>

	{#if editor && $editor}
		{#if editable}
			{@render fixedMenu?.($editor)}
		{/if}

		<EditorContent editor={$editor} />

		{#if editable}
			<BubbleMenu editor={$editor}>
				{@render bubbleMenu?.($editor)}
			</BubbleMenu>
		{/if}

		{#if !editable && onQuoteSelection}
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
	{:else}
		<div class="flex justify-center items-center h-32">
			<span class="loading loading-spinner loading-md"></span>
		</div>
	{/if}

	{#if showStats}
		<div
			class="mt-2 pt-2 border-t border-base-300 text-xs text-base-content/60 flex flex-wrap gap-x-4 gap-y-1"
		>
			<span>
				<i class="fa-solid fa-font"></i>
				{m.paperStatsWords({ count: stats.words })}
			</span>
			<span>
				<i class="fa-solid fa-text-width"></i>
				{m.paperStatsCharacters({ count: stats.characters })}
			</span>
			<span>
				<i class="fa-solid fa-paragraph"></i>
				{m.paperStatsParagraphs({ count: stats.paragraphs })}
			</span>
			<span>
				<i class="fa-solid fa-clock"></i>
				{m.paperStatsReadingTime({ count: stats.readingTimeMinutes })}
			</span>
		</div>
	{/if}
</fieldset>
