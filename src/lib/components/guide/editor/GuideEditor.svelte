<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { createEditor, EditorContent, type Editor } from 'svelte-tiptap';
	import { toast } from 'svelte-sonner';
	import MenuButton from '#lib/components/paper/editor/menu/Button.svelte';
	import MenuDivider from '#lib/components/paper/editor/menu/Divider.svelte';
	import { promptDialog } from '#lib/state/dialogs.svelte.js';
	import { uploadFile } from '#lib/api/uploadFile';
	import { m } from '#lib/paraglide/messages';
	import { fileHref, PLACEHOLDERS, type GuideDocument } from '#lib/guide/document';
	import { calloutColor } from '#lib/guide/blocks';
	import { guideExtensions } from './guideExtensions';
	import './guideEditor.css';

	/**
	 * The WYSIWYG editor of a guide page (`docs/plans/guide.md`, "Editor and blocks"): TipTap with
	 * the guide's blocks. Images and downloads are uploaded as guide files of the conference and
	 * named `file:<id>`; `fileUrl` shows them while editing.
	 */
	interface Props {
		content: GuideDocument;
		conferenceId: string;
		fileUrl: (src: string) => string | undefined;
		onChange: (doc: GuideDocument) => void;
		/** Called once a file was uploaded, so the page can show it. */
		onUpload?: (fileId: string) => void;
	}

	let { content, conferenceId, fileUrl, onChange, onUpload }: Props = $props();

	let editor = $state<Readable<Editor>>();

	onMount(() => {
		editor = createEditor({
			extensions: guideExtensions({ placeholder: m.guideEditorPlaceholder(), resolveSrc: fileUrl }),
			content,
			editorProps: {
				attributes: {
					class: 'prose max-w-none focus:outline-none p-4 min-h-96',
					'aria-label': m.guideEditorLabel()
				}
			},
			onUpdate: ({ editor: changed }) =>
				onChange({ type: 'doc', content: changed.getJSON().content })
		});
	});

	onDestroy(() => {
		$editor?.destroy();
	});

	const run = (action: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) =>
		$editor && action($editor.chain().focus()).run();
	const isActive = (name: string, attrs?: Record<string, unknown>) =>
		$editor?.isActive(name, attrs) ?? false;

	async function setLink() {
		const current = $editor?.getAttributes('link').href;
		const href = await promptDialog({
			title: m.guideEditorLink(),
			text: m.guideEditorLinkPrompt(),
			initialValue: typeof current === 'string' ? current : 'https://'
		});
		if (href === null) return;
		if (href.trim() === '') run((chain) => chain.extendMarkRange('link').unsetLink());
		else run((chain) => chain.extendMarkRange('link').setLink({ href: href.trim() }));
	}

	/** Uploads a file as a guide file of the conference; its id, or undefined when that failed. */
	async function uploadGuideFile(file: File) {
		const upload = uploadFile({ file, target: { kind: 'guide', field: 'file', conferenceId } });
		toast.promise(upload, {
			loading: m.guideEditorUploading(),
			success: m.guideEditorUploaded(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		const id = await upload.catch(() => undefined);
		if (id) onUpload?.(id);
		return id;
	}

	/** Uploads the file picked, if any; its id and name, or undefined. */
	async function uploadPicked(file: File | undefined) {
		if (!file) return undefined;
		const id = await uploadGuideFile(file);
		return id ? { id, name: file.name } : undefined;
	}

	/** Lets the user pick a file and uploads it; its id and name, or undefined. */
	function pickAndUpload(accept: string): Promise<{ id: string; name: string } | undefined> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = accept;
			input.onchange = () => resolve(uploadPicked(input.files?.[0]));
			input.click();
		});
	}

	async function insertImage() {
		const file = await pickAndUpload('image/png,image/jpeg,image/webp,image/gif,image/svg+xml');
		if (!file) return;
		const caption = await promptDialog({
			title: m.guideEditorImage(),
			text: m.guideEditorCaption()
		});
		run((chain) =>
			chain.insertContent({
				type: 'image',
				attrs: { src: fileHref(file.id), alt: caption || file.name, title: caption || null }
			})
		);
	}

	async function insertFile() {
		const file = await pickAndUpload('application/pdf,image/*');
		if (!file) return;
		run((chain) =>
			chain.insertContent({
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: file.name,
						marks: [{ type: 'link', attrs: { href: fileHref(file.id) } }]
					}
				]
			})
		);
	}

	async function insertCallout() {
		const emoji = await promptDialog({
			title: m.guideEditorCallout(),
			text: m.guideEditorCalloutEmoji(),
			initialValue: '💡'
		});
		if (emoji === null) return;
		run((chain) =>
			chain.insertContent({
				type: 'callout',
				attrs: { emoji, color: 'info' },
				content: [{ type: 'paragraph' }]
			})
		);
	}

	async function insertToggle() {
		const summary = await promptDialog({
			title: m.guideEditorToggle(),
			text: m.guideEditorToggleSummary()
		});
		if (!summary) return;
		run((chain) =>
			chain.insertContent({ type: 'toggle', attrs: { summary }, content: [{ type: 'paragraph' }] })
		);
	}

	async function insertButton() {
		const label = await promptDialog({
			title: m.guideEditorButton(),
			text: m.guideEditorButtonLabel()
		});
		if (!label) return;
		const href = await promptDialog({
			title: m.guideEditorButton(),
			text: m.guideEditorLinkPrompt(),
			initialValue: 'https://'
		});
		if (!href) return;
		run((chain) => chain.insertContent({ type: 'button', attrs: { label, href } }));
	}

	async function insertEmbed() {
		const url = await promptDialog({ title: m.guideEditorEmbed(), text: m.guideEditorEmbedUrl() });
		if (!url) return;
		run((chain) => chain.insertContent({ type: 'embed', attrs: { url } }));
	}

	/** Asks for one text, offering the block's current value. */
	const ask = ({
		title,
		text,
		block,
		key
	}: {
		title: string;
		text: string;
		block: string;
		key: string;
	}) =>
		promptDialog({ title, text, initialValue: String($editor?.getAttributes(block)[key] ?? '') });

	async function editCallout() {
		const emoji = await ask({
			title: m.guideEditorCallout(),
			text: m.guideEditorCalloutEmoji(),
			block: 'callout',
			key: 'emoji'
		});
		if (emoji === null) return;
		const color = await ask({
			title: m.guideEditorCallout(),
			text: m.guideEditorCalloutColor(),
			block: 'callout',
			key: 'color'
		});
		run((chain) => chain.updateAttributes('callout', { emoji, color: calloutColor(color) }));
	}

	async function editToggle() {
		const summary = await ask({
			title: m.guideEditorToggle(),
			text: m.guideEditorToggleSummary(),
			block: 'toggle',
			key: 'summary'
		});
		if (summary !== null) run((chain) => chain.updateAttributes('toggle', { summary }));
	}

	async function editImage() {
		const caption = await ask({
			title: m.guideEditorImage(),
			text: m.guideEditorCaption(),
			block: 'image',
			key: 'title'
		});
		if (caption !== null)
			run((chain) => chain.updateAttributes('image', { title: caption, alt: caption }));
	}

	async function editButton() {
		const label = await ask({
			title: m.guideEditorButton(),
			text: m.guideEditorButtonLabel(),
			block: 'button',
			key: 'label'
		});
		if (label === null) return;
		const href = await ask({
			title: m.guideEditorButton(),
			text: m.guideEditorLinkPrompt(),
			block: 'button',
			key: 'href'
		});
		if (href !== null) run((chain) => chain.updateAttributes('button', { label, href }));
	}

	/** How each block's attributes are changed. */
	const BLOCK_EDITORS: Record<string, () => Promise<void>> = {
		callout: editCallout,
		toggle: editToggle,
		image: editImage,
		button: editButton
	};

	/** Changes the attributes of the callout, toggle, image or button around the cursor. */
	async function editBlock() {
		const block = Object.keys(BLOCK_EDITORS).find((name) => isActive(name));
		if (block) await BLOCK_EDITORS[block]();
	}

	/** Lifts the content out of the callout or toggle around the cursor. */
	const unwrap = () => run((chain) => chain.lift(isActive('callout') ? 'callout' : 'toggle'));

	const blockSelected = $derived(Object.keys(BLOCK_EDITORS).some((name) => isActive(name)));
</script>

{#if $editor}
	<ul
		class="menu menu-horizontal bg-base-100 border-base-300 rounded-box sticky top-16 z-10 w-full flex-wrap gap-1 border shadow-sm"
		aria-label={m.guideEditorToolbar()}
	>
		<MenuButton
			label={m.bold()}
			icon="text-b"
			active={isActive('bold')}
			onClick={() => run((c) => c.toggleBold())}
		/>
		<MenuButton
			label={m.italic()}
			icon="text-italic"
			active={isActive('italic')}
			onClick={() => run((c) => c.toggleItalic())}
		/>
		<MenuButton
			label={m.underline()}
			icon="text-underline"
			active={isActive('underline')}
			onClick={() => run((c) => c.toggleUnderline())}
		/>
		<MenuButton
			label={m.guideEditorStrike()}
			icon="text-strikethrough"
			active={isActive('strike')}
			onClick={() => run((c) => c.toggleMark('strike'))}
		/>
		<MenuButton
			label={m.guideEditorCode()}
			icon="code"
			active={isActive('code')}
			onClick={() => run((c) => c.toggleMark('code'))}
		/>
		<MenuDivider />
		{#each [2, 3, 4] as const as level (level)}
			<MenuButton
				label={m.guideEditorHeading({ level })}
				icon="text-h-{['', '', 'two', 'three', 'four'][level]}"
				active={isActive('heading', { level })}
				onClick={() => run((c) => c.toggleHeading({ level }))}
			/>
		{/each}
		<MenuButton
			label={m.bulletList()}
			icon="list-bullets"
			active={isActive('bulletList')}
			onClick={() => run((c) => c.toggleBulletList())}
		/>
		<MenuButton
			label={m.orderedList()}
			icon="list-numbers"
			active={isActive('orderedList')}
			onClick={() => run((c) => c.toggleOrderedList())}
		/>
		<MenuButton
			label={m.guideEditorQuote()}
			icon="quotes"
			active={isActive('blockquote')}
			onClick={() => run((c) => c.toggleBlockquote())}
		/>
		<MenuButton
			label={m.guideEditorRule()}
			icon="minus"
			onClick={() => run((c) => c.insertContent({ type: 'horizontalRule' }))}
		/>
		<MenuDivider />
		<MenuButton
			label={m.guideEditorLink()}
			icon="link"
			active={isActive('link')}
			onClick={setLink}
		/>
		<MenuButton label={m.guideEditorImage()} icon="image" onClick={insertImage} />
		<MenuButton label={m.guideEditorFile()} icon="paperclip" onClick={insertFile} />
		<MenuDivider />
		<MenuButton
			label={m.guideEditorCallout()}
			icon="info"
			active={isActive('callout')}
			onClick={insertCallout}
		/>
		<MenuButton
			label={m.guideEditorToggle()}
			icon="caret-circle-down"
			active={isActive('toggle')}
			onClick={insertToggle}
		/>
		<MenuButton label={m.guideEditorButton()} icon="cursor-click" onClick={insertButton} />
		<MenuButton label={m.guideEditorEmbed()} icon="youtube-logo" onClick={insertEmbed} />
		{#if blockSelected}
			<MenuButton label={m.guideEditorEditBlock()} icon="pencil-simple" onClick={editBlock} />
		{/if}
		{#if isActive('callout') || isActive('toggle')}
			<MenuButton label={m.guideEditorUnwrap()} icon="arrow-square-out" onClick={unwrap} />
		{/if}
		<MenuDivider />
		<li>
			<details class="dropdown">
				<summary aria-label={m.guideEditorPlaceholders()}>
					<i class="ph-duotone ph-brackets-curly" aria-hidden="true"></i>
				</summary>
				<ul class="dropdown-content menu bg-base-100 rounded-box z-20 w-56 p-2 shadow">
					{#each PLACEHOLDERS as name (name)}
						<li>
							<button type="button" onclick={() => run((c) => c.insertContent(`{{${name}}}`))}>
								{`{{${name}}}`}
							</button>
						</li>
					{/each}
				</ul>
			</details>
		</li>
		<MenuButton
			label={m.undo()}
			icon="arrow-counter-clockwise"
			onClick={() => run((c) => c.undo())}
		/>
		<MenuButton label={m.redo()} icon="arrow-clockwise" onClick={() => run((c) => c.redo())} />
	</ul>
{/if}

<div
	class="rounded-box border-base-content/30 bg-base-100 focus-within:border-primary focus-within:ring-primary/40 mt-2 border focus-within:ring-2"
	data-testid="guide-editor"
>
	{#if $editor}
		<EditorContent editor={$editor} />
	{/if}
</div>
