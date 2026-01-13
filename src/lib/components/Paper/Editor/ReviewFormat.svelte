<script lang="ts">
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import Link from '@tiptap/extension-link';
	import { BlockquoteWithFind } from './extensions/BlockquoteWithFind';
	import Heading from '@tiptap/extension-heading';
	import Menu from './Menu';
	import SnippetDropdown from './Menu/SnippetDropdown.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Readable } from 'svelte/store';
	import { SnippetSuggestion, type SnippetItem } from './extensions/SnippetSuggestion';
	import PlaceholderPromptModal from './PlaceholderPromptModal.svelte';
	import { extractPlaceholders, replacePlaceholders } from '$lib/services/snippetPlaceholders';
	import type { JSONContent } from '@tiptap/core';

	interface Props {
		contentStore: Writable<any>;
		placeholder?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
		paperContainer?: HTMLElement | null;
		snippets?: SnippetItem[];
	}

	let {
		contentStore,
		placeholder = '',
		quoteToInsert,
		onQuoteInserted,
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
		if (quoteToInsert && $editor && quoteToInsert !== lastInsertedQuote) {
			$editor
				.chain()
				.focus()
				.insertContent([
					{
						type: 'blockquote',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: quoteToInsert }] }]
					},
					{ type: 'paragraph' }
				])
				.run();
			lastInsertedQuote = quoteToInsert;
			onQuoteInserted?.();
		}
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
			content: $contentStore || undefined,
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
		const content = $contentStore;
		// Only clear if store is empty object AND editor actually has content
		if ($editor && content && Object.keys(content).length === 0 && !$editor.isEmpty) {
			$editor.commands.clearContent();
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
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={$editor.isActive('heading', { level: 2 })}
				label={m.heading2()}
				icon="fa-heading"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleHeading({ level: 3 }).run()}
				active={$editor.isActive('heading', { level: 3 })}
				label={m.heading3()}
				icon="fa-h"
			/>

			<Menu.Divider />

			<Menu.Button
				onClick={() => $editor.chain().focus().toggleBold().run()}
				active={$editor.isActive('bold')}
				label={m.bold()}
				icon="fa-bold"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleItalic().run()}
				active={$editor.isActive('italic')}
				label={m.italic()}
				icon="fa-italic"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleUnderline().run()}
				active={$editor.isActive('underline')}
				label={m.underline()}
				icon="fa-underline"
			/>
			<Menu.Button
				onClick={setLink}
				active={$editor.isActive('link')}
				label={m.link()}
				icon="fa-link"
			/>

			<Menu.Divider />

			<Menu.Button
				onClick={() => $editor.chain().focus().toggleBulletList().run()}
				active={$editor.isActive('bulletList')}
				label={m.bulletList()}
				icon="fa-list"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleOrderedList().run()}
				active={$editor.isActive('orderedList')}
				label={m.orderedList()}
				icon="fa-list-ol"
			/>
			<Menu.Button
				onClick={() => $editor.chain().focus().toggleBlockquote().run()}
				active={$editor.isActive('blockquote')}
				label={m.blockquote()}
				icon="fa-quote-left"
			/>

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
