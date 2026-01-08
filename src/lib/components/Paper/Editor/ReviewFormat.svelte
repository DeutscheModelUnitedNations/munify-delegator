<script lang="ts">
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import Menu from './Menu';
	import { m } from '$lib/paraglide/messages';
	import type { Readable } from 'svelte/store';

	interface Props {
		contentStore: Writable<any>;
		placeholder?: string;
	}

	let { contentStore, placeholder = '' }: Props = $props();

	let editor = $state<Readable<Editor>>();

	onMount(() => {
		editor = createEditor({
			extensions: [
				...getCommonExtensions(),
				OrderedList,
				BulletList,
				ListItem,
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
		</Menu.Wrapper>
	{/if}

	{#if $editor}
		<EditorContent editor={$editor} />
	{/if}
</fieldset>
