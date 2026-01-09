<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createEditor, EditorContent, type Editor } from 'svelte-tiptap';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Link from '@tiptap/extension-link';
	import { BlockquoteWithFind } from './extensions/BlockquoteWithFind';
	import Heading from '@tiptap/extension-heading';
	import { m } from '$lib/paraglide/messages';
	import type { Readable } from 'svelte/store';

	interface Props {
		content: any;
		paperContainer?: HTMLElement | null;
	}

	let { content, paperContainer = null }: Props = $props();

	let editor = $state<Readable<Editor>>();

	onMount(() => {
		editor = createEditor({
			extensions: [
				...getCommonExtensions(),
				OrderedList,
				BulletList,
				ListItem,
				Link.configure({
					openOnClick: true,
					HTMLAttributes: {
						class: 'text-primary underline'
					}
				}),
				BlockquoteWithFind.configure({
					getPaperContainer: () => paperContainer,
					findInPaperLabel: m.findInPaper(),
					citeNotFoundLabel: m.citeNotFound()
				}),
				Heading.configure({
					levels: [2, 3]
				})
			],
			content: content || undefined,
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none px-2'
				}
			},
			editable: false
		});
	});

	onDestroy(() => {
		if ($editor) {
			$editor.destroy();
		}
	});
</script>

<div class="read-only-content">
	{#if $editor}
		<EditorContent editor={$editor} />
	{/if}
</div>
