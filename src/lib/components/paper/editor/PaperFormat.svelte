<script lang="ts">
	import type { EditorOptions } from '@tiptap/core';
	import CommonEditor from './CommonEditor.svelte';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import { UndoRedo } from '@tiptap/extensions';
	import Menu from './menu';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		editable?: boolean;
		onQuoteSelection?: (text: string) => void;
	}

	let { editable = false, onQuoteSelection }: Props = $props();

	let settings: Partial<EditorOptions> = {
		extensions: [
			...getCommonExtensions(),
			OrderedList,
			BulletList,
			ListItem,
			UndoRedo,
			Placeholder.configure({
				placeholder: m.editorPlaceholder(),
				showOnlyCurrent: true
			})
		]
	};
</script>

{#if settings}
	<CommonEditor {settings} {editable} {onQuoteSelection} showStats>
		{#snippet fixedMenu(editor)}
			<Menu.Wrapper>
				<Menu.Button
					onClick={() => editor.commands.undo()}
					label={m.undo()}
					icon="fa-rotate-left"
				/>
				<Menu.Button
					onClick={() => editor.commands.redo()}
					label={m.redo()}
					icon="fa-rotate-right"
				/>
				<Menu.Divider />
				<Menu.ToggleButtons {editor} items={['orderedList', 'bulletList']} />

				<Menu.Divider />

				<Menu.ToggleButtons
					{editor}
					items={['bold', 'italic', 'underline', 'superscript', 'subscript']}
				/>
			</Menu.Wrapper>
		{/snippet}
	</CommonEditor>
{/if}
