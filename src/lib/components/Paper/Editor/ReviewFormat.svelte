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
	import { m } from '$lib/paraglide/messages';
	import type { Readable } from 'svelte/store';

	interface Props {
		contentStore: Writable<any>;
		placeholder?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
		paperContainer?: HTMLElement | null;
	}

	let {
		contentStore,
		placeholder = '',
		quoteToInsert,
		onQuoteInserted,
		paperContainer = null
	}: Props = $props();

	let editor = $state<Readable<Editor>>();

	// Track last inserted quote to prevent duplicates
	let lastInsertedQuote = $state<string | null>(null);

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
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 min-h-[200px]">
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
		</Menu.Wrapper>
	{/if}

	{#if $editor}
		<EditorContent editor={$editor} />
	{/if}
</fieldset>
