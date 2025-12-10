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
	}

	let { settings, editable = true, fixedMenu, bubbleMenu }: Props = $props();

	let editor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			...settings,
			content: $editorContentStore,
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none px-2 pb-2'
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
</fieldset>
