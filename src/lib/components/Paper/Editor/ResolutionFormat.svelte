<script lang="ts">
	import type { EditorOptions } from '@tiptap/core';
	import CommonEditor from './CommonEditor.svelte';
	import { getCommonExtensions } from './settings/common.svelte';
	import { OrderedList, BulletList, ListItem } from '@tiptap/extension-list';
	import Placeholder from '@tiptap/extension-placeholder';
	import DragHandle from '@tiptap/extension-drag-handle';
	import Menu from './Menu';
	import { m } from '$lib/paraglide/messages';
	import { ResolutionDocument } from './extensions/ResolutionDocument';
	import { PreambleSection } from './extensions/PreambleSection';
	import { OperativeSection } from './extensions/OperativeSection';
	import { OperativeClause } from './extensions/OperativeClause';
	import { PreambleClause } from './extensions/PreambleClause';
	import { SubClause } from './extensions/SubClause';
	import { SubClauseGroup } from './extensions/SubClauseGroup';
	import { ResolutionHeader } from './extensions/ResolutionHeader';

	interface Props {
		editable?: boolean;
	}

	let { editable }: Props = $props();

	// const baseContent = `
	//        <div data-type="preamble-section">
	//        </div>
	//        <ol data-type="operative-section">
	//          <li><p>Test</p><li>
	//        </ol>
	//      `;

	const baseContent = JSON.parse(
		'{"type":"doc","content":[{"type":"resolutionHeader"},{"type":"preambleSection","content":[{"type":"preambleClause","content":[{"type":"text","text":"in Bekräftigung der Resolutionen 1542 (2004), 1944 (2010), 2350 (2017), 2699 (2023) des UN-Sicherheitsrats über Haiti in Erwartung der Unterstützung der Mitglieder der Vereinten Nationen in Hinblick auf die Konfliktsituation in Haiti sowie des Programms BINUH der Vereinten Nationen in Haiti"}]},{"type":"preambleClause","content":[{"type":"text","text":"anerkennend, dass dringender Handlungsbedarf besteht, damit langfristig in Haiti auch ohne internationale Unterstützung ein funktionierender demokratischer Staat sowie ein funktionierendes Sicherheitssystem gewährleistet ist"}]}]},{"type":"operativeSection","content":[{"type":"operativeClause","content":[{"type":"paragraph","content":[{"type":"text","text":"fordert ein Paket für Soforthilfemaßnahmen, welches beinhaltet, dass"}]},{"type":"subClauseGroup","content":[{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"lebenswichtige Ressourcen wie Nahrungsmitteln, Wasser, Medikamente und Unterkünfte für die von der aktuellen Krise betroffenen Haitianer geliefert und bereitgestellt werden,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"die humanitären Organisationen und internationalen Partnern mobilisiert werden, um die Effizienz und Reichweite der Hilfsmaßnahmen zu maximieren,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Notunterkünfte und medizinischen Einrichtungen zur Versorgung der Verletzten und Kranken eingerichtet werden, um das aktuelle Leid einzugrenzen;"}]}]}]}]},{"type":"operativeClause","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic"}],"text":"beauftragt"},{"type":"text","text":", in Bezug auf die oben genannten Herausforderungen, den Inter-Agency Standing Committee (IASC)"}]},{"type":"subClauseGroup","content":[{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Aktivierung des Humanitarian System-Wide Scale-Up Protokolls für einen Zeitraum von sechs Monaten,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Verteilung folgender Aufgaben auf die Task Forces um die Situation der Bevölkerung zu verbessern und die Hilfen von NGOs und der BINUH zu stärken:"}]},{"type":"subClauseGroup","content":[{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Koordination der humanitären Hilfeleistungen in Haiti und Optimierung der Ressourcennutzung und Vermeidung von Doppelarbeit , unter besonderer Berücksichtigung der Task Force für Lokalisierung, um die Einbindung lokaler und staatlicher Akteure zu stärken,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Führung und Organisation der Zusammenarbeit zwischen allen in Haiti aktiven humanitären Akteuren, unterstützt durch die Task Force für die Zentralität des Schutzes, um den Schutz der betroffenen Bevölkerung zu gewährleisten,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Kontrolle der humanitären Hilfe, wobei die Task Force für Rechenschaftspflicht gegenüber betroffenen Personen sicherstellt, dass die Bedürfnisse und das Feedback der Gemeinschaften berücksichtigt werden, um fehler der vorausgegangen Missionen nicht zu wiederholen,"}]}]},{"type":"subClause","content":[{"type":"paragraph","content":[{"type":"text","text":"Beschleunigung der Hilfsmaßnahmen und Sicherstellung, dass die Hilfe die betroffene Bevölkerung erreicht, wobei die Task Force für den Erhalt des humanitären Raums Leitlinien und Werkzeuge zur Überwindung bürokratischer Hindernisse bereitstellt;"}]}]}]}]}]}]}]}]}'
	);

	let settings: Partial<EditorOptions> = {
		extensions: [
			...getCommonExtensions(),
			ResolutionDocument,
			ResolutionHeader,
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
						'h-full w-4 bg-warning rounded-box flex items-start justify-center cursor-grab z-50';

					const icon = document.createElement('i');

					// Use as a hook for CSS to insert an icon
					icon.className = 'fas fa-grip-horizontal text-content/50 hover:text-content';

					element.appendChild(icon);

					return element;
				}
			}),
			Placeholder.configure({
				placeholder: m.editorPlaceholder(),
				showOnlyCurrent: true
			})
		]
	};
</script>

{#if settings}
	<CommonEditor {settings} {editable} {baseContent} additionalClasses="resolution-document">
		{#snippet fixedMenu(editor)}
			<Menu.Wrapper>
				<!-- ADD PREAMBLE CLAUSE -->
				<Menu.Button
					onClick={() => {
						let pos = -1;

						// Search the doc for the preambleSection
						editor.state.doc.descendants((node, position) => {
							if (node.type.name === 'preambleSection') {
								// Calculate the position just before the closing tag of the section
								pos = position + node.nodeSize - 1;
								return false; // Stop searching once found
							}
						});

						if (pos > -1) {
							editor
								.chain()
								.focus()
								// Insert the node at the calculated position
								.insertContentAt(pos, {
									type: 'preambleClause'
									// No 'content' needed here because preambleClause takes inline text
								})
								.run();
						}
					}}
					active={editor.isActive('preambleClause')}
					label="New Preamble"
					icon="fa-quote-left"
				/>

				<!-- ADD OPERATIVE CLAUSE -->
				<Menu.Button
					onClick={() => {
						// We ensure we insert the clause WITH a paragraph inside,
						// otherwise the schema might reject an empty block.
						let pos = -1;
						editor.state.doc.descendants((node, position) => {
							if (node.type.name === 'operativeSection') {
								// We found the section!
								// We want to insert at the end of it (position + node size - 1 for closing tag)
								pos = position + node.nodeSize - 1;
								return false; // Stop searching
							}
						});

						if (pos > -1) {
							// 2. Insert at the end of that section
							editor
								.chain()
								.focus()
								.insertContentAt(pos, {
									type: 'operativeClause',
									content: [{ type: 'paragraph' }]
								})
								.run();
						}
					}}
					active={editor.isActive('operativeClause')}
					label="New Operative"
					icon="fa-list-ol"
				/>

				<!-- ADD SUB-CLAUSE (Create a., b., c.) -->
				<Menu.Button
					onClick={() => {
						// This inserts a Group -> SubClause -> Paragraph hierarchy
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
					}}
					disabled={!editor.isActive('operativeClause') && !editor.isActive('subClause')}
					label="Add Sub-clause"
					icon="fa-indent"
				/>

				<Menu.Button
					onClick={() => editor.chain().focus().liftListItem('subClause').run()}
					disabled={!editor.can().liftListItem('subClause')}
					label="Outdent (Lift)"
					icon="fa-outdent"
				/>

				<Menu.Button
					onClick={() => editor.chain().focus().sinkListItem('subClause').run()}
					disabled={!editor.can().sinkListItem('subClause')}
					label="Indent (Sub-clause)"
					icon="fa-indent"
				/>

				<Menu.Button
					onClick={() => editor.chain().focus().joinBackward().run()}
					label="Merge with Previous"
					icon="fa-arrow-up"
				/>

				<Menu.Divider />

				<Menu.Button
					onClick={() => editor.chain().focus().toggleItalic().run()}
					active={editor.isActive('italic')}
					label={m.italic()}
					icon="fa-italic"
				/>
			</Menu.Wrapper>
		{/snippet}
	</CommonEditor>
{/if}
