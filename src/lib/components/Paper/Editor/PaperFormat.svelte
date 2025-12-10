<script lang="ts">
	import type { EditorOptions } from '@tiptap/core';
	import CommonEditor from './CommonEditor.svelte';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import Menu from './Menu';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		editable?: boolean;
	}

	let { editable }: Props = $props();

	let settings: Partial<EditorOptions> = {
		extensions: [
			...getCommonExtensions(),
			OrderedList,
			BulletList,
			ListItem,
			Placeholder.configure({
				placeholder: m.editorPlaceholder(),
				showOnlyCurrent: true
			})
		]
	};
</script>

{#if settings}
	<CommonEditor {settings} {editable}>
		{#snippet fixedMenu(editor)}
			<Menu.Wrapper>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					active={editor.isActive('orderedList')}
					label={m.orderedList()}
					icon="fa-list-ol"
				/>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					active={editor.isActive('bulletList')}
					label={m.bulletList()}
					icon="fa-list"
				/>

				<Menu.Divider />

				<Menu.Button
					onClick={() => editor.chain().focus().toggleBold().run()}
					active={editor.isActive('bold')}
					label={m.bold()}
					icon="fa-bold"
				/>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleItalic().run()}
					active={editor.isActive('italic')}
					label={m.italic()}
					icon="fa-italic"
				/>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleUnderline().run()}
					active={editor.isActive('underline')}
					label={m.underline()}
					icon="fa-underline"
				/>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleSuperscript().run()}
					active={editor.isActive('superscript')}
					label={m.superscript()}
					icon="fa-superscript"
				/>
				<Menu.Button
					onClick={() => editor.chain().focus().toggleSubscript().run()}
					active={editor.isActive('subscript')}
					label={m.subscript()}
					icon="fa-subscript"
				/>
			</Menu.Wrapper>
		{/snippet}
	</CommonEditor>
{/if}
