<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import Link from '@tiptap/extension-link';
	import { BlockquoteWithFind } from './extensions/BlockquoteWithFind';
	import Heading from '@tiptap/extension-heading';
	import Menu from './menu';
	import SnippetDropdown from './menu/SnippetDropdown.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Readable } from 'svelte/store';
	import { SnippetSuggestion, type SnippetItem } from './extensions/SnippetSuggestion';
	import PlaceholderPromptModal from './PlaceholderPromptModal.svelte';
	import { extractPlaceholders, replacePlaceholders } from '$lib/helpers/snippetPlaceholders';
	import type { JSONContent } from '@tiptap/core';
	import { getSafeTipTapContent, isEmptyTipTapDocument } from './contentValidation';
	import { UndoRedo } from '@tiptap/extensions';

	interface Props {
		contentStore: Writable<JSONContent>;
		placeholder?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
		paperContainer?: HTMLElement | null;
		snippets?: SnippetItem[];
	}

	let {
		// Read and written as `$contentStore` below; fallow does not count store auto-subscriptions.
		// fallow-ignore-next-line unused-component-prop
		contentStore,
		placeholder = '',
		quoteToInsert,
		onQuoteInserted = () => {},
		paperContainer = null,
		snippets = []
	}: Props = $props();

	let editor = $state<Readable<Editor>>();

	// Track last inserted quote to prevent duplicates
	let lastInsertedQuote = $state<string | null>(null);

	// Placeholder modal state
	let placeholderModalOpen = $state(false);
	let pendingSnippet = $state<SnippetItem | null>(null);
	let currentPlaceholders = $state<string[]>([]);

	// Handle snippet selection (from dropdown menu or slash command)
	function handleSnippetSelect(snippet: SnippetItem) {
		const placeholders = extractPlaceholders(snippet.content);
		if (placeholders.length > 0) {
			// Show placeholder prompt modal
			pendingSnippet = snippet;
			currentPlaceholders = placeholders;
			placeholderModalOpen = true;
		} else {
			// No placeholders, insert directly
			insertSnippetContent(snippet.content);
		}
	}

	// Insert snippet content into editor
	function insertSnippetContent(content: JSONContent) {
		if ($editor) {
			$editor.chain().focus().insertContent(content).run();
		}
	}

	// Handle placeholder modal confirmation
	function handlePlaceholderConfirm(values: Record<string, string>) {
		if (pendingSnippet) {
			const filledContent = replacePlaceholders(pendingSnippet.content, values);
			insertSnippetContent(filledContent);
		}
		pendingSnippet = null;
		currentPlaceholders = [];
	}

	// Handle placeholder modal cancel
	function handlePlaceholderCancel() {
		pendingSnippet = null;
		currentPlaceholders = [];
	}

	// Insert quote when quoteToInsert changes
	$effect(() => {
		const quote = quoteToInsert;
		if (!$editor || !quote || quote === lastInsertedQuote) return;
		$editor
			.chain()
			.focus()
			.insertContent([
				{
					type: 'blockquote',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: quote }] }]
				},
				{ type: 'paragraph' }
			])
			.run();
		lastInsertedQuote = quote;
		onQuoteInserted();
	});

	const setLink = () => {
		const previousUrl = $editor?.getAttributes('link').href;
		const url = window.prompt(m.enterUrl(), previousUrl);

		if (url === null) return; // cancelled
		if (url === '') {
			$editor?.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		$editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};

	let editorElement: HTMLElement | null = null;

	onMount(() => {
		editor = createEditor({
			extensions: [
				...getCommonExtensions(),
				OrderedList,
				BulletList,
				ListItem,
				UndoRedo,
				BlockquoteWithFind.configure({
					getPaperContainer: () => paperContainer,
					findInPaperLabel: m.findInPaper(),
					citeNotFoundLabel: m.citeNotFound()
				}),
				Heading.configure({
					levels: [2, 3]
				}),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: {
						class: 'text-primary underline'
					}
				}),
				Placeholder.configure({
					placeholder: placeholder || m.enterYourReviewComments(),
					showOnlyCurrent: true
				}),
				// Always add snippet suggestion extension - it uses a getter to access current snippets
				SnippetSuggestion.configure({
					snippets: () => snippets, // Pass getter function for reactive access
					onSelectSnippet: handleSnippetSelect
				})
			],
			content: getSafeTipTapContent($contentStore),
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none p-3 min-h-[150px]'
				}
			},
			onUpdate: ({ editor }) => {
				$contentStore = editor.getJSON();
			},
			editable: true
		});
	});

	// Clear editor when store is reset externally (e.g., after review submission)
	$effect(() => {
		// Check if store contains an empty TipTap document (reset state)
		const isEmptyDocument = isEmptyTipTapDocument($contentStore);
		// Only clear if store is empty document AND editor actually has content
		if ($editor && isEmptyDocument && !$editor.isEmpty) {
			$editor.commands.clearContent();
		}
	});

	onDestroy(() => {
		if ($editor) {
			$editor.destroy();
		}
	});
</script>

<fieldset
	class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 min-h-[200px]"
	bind:this={editorElement}
>
	<legend class="fieldset-legend">{m.editor()}</legend>

	{#if $editor}
		<Menu.Wrapper>
			<Menu.Button onClick={() => $editor.commands.undo()} label={m.undo()} icon="fa-rotate-left" />
			<Menu.Button
				onClick={() => $editor.commands.redo()}
				label={m.redo()}
				icon="fa-rotate-right"
			/>
			<Menu.Divider />
			<Menu.ToggleButtons editor={$editor} items={['heading2', 'heading3']} />

			<Menu.Divider />

			<Menu.ToggleButtons editor={$editor} items={['bold', 'italic', 'underline']} />
			<Menu.Button
				onClick={setLink}
				active={$editor.isActive('link')}
				label={m.link()}
				icon="fa-link"
			/>

			<Menu.Divider />

			<Menu.ToggleButtons editor={$editor} items={['bulletList', 'orderedList', 'blockquote']} />

			<Menu.Divider />

			<Menu.Button
				onClick={() => $editor.chain().focus().liftListItem('listItem').run()}
				disabled={!$editor.can().liftListItem('listItem')}
				label={m.outdent()}
				icon="fa-outdent"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().sinkListItem('listItem').run()}
				disabled={!$editor.can().sinkListItem('listItem')}
				label={m.indent()}
				icon="fa-indent"
			/>

			{#if snippets.length > 0}
				<Menu.Divider />
				<SnippetDropdown {snippets} onSelect={handleSnippetSelect} />
			{/if}
		</Menu.Wrapper>
	{/if}

	{#if $editor}
		<EditorContent editor={$editor} />
		{#if snippets.length > 0}
			<p class="text-xs text-base-content/50 mt-2 px-1">
				{m.typeSlashForSnippets()}
			</p>
		{/if}
	{/if}
</fieldset>

<!-- Placeholder prompt modal -->
<PlaceholderPromptModal
	bind:open={placeholderModalOpen}
	placeholders={currentPlaceholders}
	onConfirm={handlePlaceholderConfirm}
	onCancel={handlePlaceholderCancel}
/>
