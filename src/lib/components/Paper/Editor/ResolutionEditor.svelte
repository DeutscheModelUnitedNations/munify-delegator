<script lang="ts">
	import type { EditorOptions, JSONContent } from '@tiptap/core';
	import type { Editor } from 'svelte-tiptap';
	import CommonEditor from './CommonEditor.svelte';
	import { getCommonExtensions } from './settings/common.svelte';
	import Placeholder from '@tiptap/extension-placeholder';
	import DragHandle from '@tiptap/extension-drag-handle';
	import Menu from './Menu';
	import { ResolutionDocument } from './extensions/ResolutionDocument';
	import { PreambleSection } from './extensions/PreambleSection';
	import { OperativeSection } from './extensions/OperativeSection';
	import { OperativeClause } from './extensions/OperativeClause';
	import { PreambleClause } from './extensions/PreambleClause';
	import { SubClause } from './extensions/SubClause';
	import { SubClauseGroup } from './extensions/SubClauseGroup';
	import { ResolutionHeader } from './extensions/ResolutionHeader';

	interface Props {
		committeeName: string;
		editable?: boolean;
		initialContent?: JSONContent;
		onQuoteSelection?: (text: string) => void;
	}

	let { committeeName, editable = true, initialContent, onQuoteSelection }: Props = $props();

	// Default empty resolution structure with committee name
	const createDefaultContent = (name: string): JSONContent => ({
		type: 'doc',
		content: [
			{
				type: 'resolutionHeader',
				attrs: { committeeName: name }
			},
			{
				type: 'preambleSection',
				content: [{ type: 'preambleClause', content: [] }]
			},
			{
				type: 'operativeSection',
				content: [
					{
						type: 'operativeClause',
						content: [{ type: 'paragraph' }]
					}
				]
			}
		]
	});

	let defaultContent = $derived(createDefaultContent(committeeName));

	let settings: Partial<EditorOptions> = $derived({
		extensions: [
			...getCommonExtensions(),
			ResolutionDocument,
			ResolutionHeader.configure({
				committeeName
			}),
			PreambleSection,
			PreambleClause,
			OperativeSection,
			OperativeClause,
			SubClause,
			SubClauseGroup,
			DragHandle.configure({
				render: () => {
					const element = document.createElement('div');
					element.className =
						'h-full w-4 flex items-center justify-center cursor-grab opacity-30 hover:opacity-70 transition-opacity';
					const icon = document.createElement('i');
					icon.className = 'fas fa-grip-vertical text-base-content';
					element.appendChild(icon);
					return element;
				}
			}),
			Placeholder.configure({
				placeholder: ({ node }) => {
					if (node.type.name === 'preambleClause') {
						return 'Enter preambular clause (e.g., "Recalling...")';
					}
					if (node.type.name === 'paragraph') {
						return 'Enter operative clause (e.g., "Decides...")';
					}
					return '';
				},
				showOnlyCurrent: true
			})
		]
	});

	// Helper functions for menu actions
	const insertPreambleClause = (editor: Editor) => {
		let pos = -1;
		editor.state.doc.descendants((node, position) => {
			if (node.type.name === 'preambleSection') {
				pos = position + node.nodeSize - 1;
				return false;
			}
		});
		if (pos > -1) {
			editor.chain().focus().insertContentAt(pos, { type: 'preambleClause' }).run();
		}
	};

	const insertOperativeClause = (editor: Editor) => {
		let pos = -1;
		editor.state.doc.descendants((node, position) => {
			if (node.type.name === 'operativeSection') {
				pos = position + node.nodeSize - 1;
				return false;
			}
		});
		if (pos > -1) {
			editor
				.chain()
				.focus()
				.insertContentAt(pos, {
					type: 'operativeClause',
					content: [{ type: 'paragraph' }]
				})
				.run();
		}
	};

	const insertSubClause = (editor: Editor) => {
		editor
			.chain()
			.focus()
			.insertContent({
				type: 'subClauseGroup',
				content: [
					{
						type: 'subClause',
						content: [{ type: 'paragraph' }]
					}
				]
			})
			.run();
	};
</script>

{#if settings}
	<CommonEditor
		{settings}
		{editable}
		baseContent={initialContent ?? defaultContent}
		{onQuoteSelection}
		additionalClasses="resolution-document"
		showStats
	>
		{#snippet fixedMenu(editor)}
			<Menu.Wrapper>
				<!-- STRUCTURE BUTTONS -->
				<Menu.Button
					onClick={() => insertPreambleClause(editor)}
					active={editor.isActive('preambleClause')}
					label="New Preamble"
					icon="fa-quote-left"
				/>

				<Menu.Button
					onClick={() => insertOperativeClause(editor)}
					active={editor.isActive('operativeClause')}
					label="New Operative"
					icon="fa-list-ol"
				/>

				<Menu.Button
					onClick={() => insertSubClause(editor)}
					disabled={!editor.isActive('operativeClause') && !editor.isActive('subClause')}
					label="Add Sub-clause"
					icon="fa-indent"
				/>

				<Menu.Divider />

				<!-- INDENTATION BUTTONS -->
				<Menu.Button
					onClick={() => editor.chain().focus().liftListItem('subClause').run()}
					disabled={!editor.can().liftListItem('subClause')}
					label="Outdent"
					icon="fa-outdent"
				/>

				<Menu.Button
					onClick={() => editor.chain().focus().sinkListItem('subClause').run()}
					disabled={!editor.can().sinkListItem('subClause')}
					label="Indent"
					icon="fa-indent"
				/>
			</Menu.Wrapper>
		{/snippet}
	</CommonEditor>
{/if}
