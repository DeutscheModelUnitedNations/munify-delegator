<script lang="ts">
	import { onMount } from 'svelte';
	import { createEditor, EditorContent, type Editor } from 'svelte-tiptap';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import type { Readable } from 'svelte/store';

	interface Props {
		content: any;
	}

	let { content }: Props = $props();

	let editor = $state<Readable<Editor>>();

	onMount(() => {
		editor = createEditor({
			extensions: [...getCommonExtensions(), OrderedList, BulletList, ListItem],
			content: content || undefined,
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none px-2'
				}
			},
			editable: false
		});
	});
</script>

<div class="read-only-content">
	{#if $editor}
		<EditorContent editor={$editor} />
	{/if}
</div>
