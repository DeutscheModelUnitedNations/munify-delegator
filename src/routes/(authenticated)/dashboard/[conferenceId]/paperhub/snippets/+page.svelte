<script context="module" lang="ts">
	function getContentPreview(content: unknown): string {
		if (!content || typeof content !== 'object') return '';
		const jsonContent = content as JSONContent;
		let text = '';

		function traverse(node: JSONContent) {
			if (node.type === 'text' && node.text) {
				text += node.text + ' ';
			}
			if (node.content) {
				node.content.forEach(traverse);
			}
		}

		traverse(jsonContent);
		const trimmed = text.trim();
		return trimmed.length > 60 ? trimmed.slice(0, 60) + '...' : trimmed;
	}
</script>

<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { createEditor, EditorContent, type Editor } from 'svelte-tiptap';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Underline from '@tiptap/extension-underline';
	import type { JSONContent } from '@tiptap/core';
	import type { Readable } from 'svelte/store';
	import Menu from '$lib/components/Paper/Editor/Menu';
	import { validatePlaceholders } from '$lib/services/snippetPlaceholders';
	import { PlaceholderHighlight } from '$lib/components/Paper/Editor/extensions/PlaceholderHighlight';
	import {
		isValidTipTapContent,
		getEmptyTipTapDocument
	} from '$lib/components/Paper/Editor/contentValidation';

	let { data }: { data: PageData } = $props();

	let snippetQuery = $derived(data.MySnippetsQuery);
	let snippets = $derived($snippetQuery?.data?.myReviewerSnippets ?? []);

	// State for editing
	let isEditing = $state(false);
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editContent = $state<JSONContent>({ type: 'doc', content: [] });
	let editor = $state<Readable<Editor> | undefined>(undefined);

	// State for delete confirmation
	let deleteConfirmOpen = $state(false);
	let deletingSnippet = $state<{ id: string; name: string } | null>(null);

	// Create mutation stores
	const createMutation = graphql(`
		mutation CreateSnippetMutation($name: String!, $content: Json!) {
			createReviewerSnippet(name: $name, content: $content) {
				id
				name
				content
			}
		}
	`);

	const updateMutation = graphql(`
		mutation UpdateSnippetMutation($id: String!, $name: String!, $content: Json!) {
			updateReviewerSnippet(id: $id, name: $name, content: $content) {
				id
				name
				content
			}
		}
	`);

	const deleteMutation = graphql(`
		mutation DeleteSnippetMutation($id: String!) {
			deleteReviewerSnippet(id: $id) {
				id
			}
		}
	`);

	function initEditor(content: JSONContent) {
		editor = createEditor({
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [2, 3]
					}
				}),
				Underline,
				Placeholder.configure({
					placeholder: m.snippetContentPlaceholder()
				}),
				PlaceholderHighlight
			],
			content,
			editorProps: {
				attributes: {
					class: 'prose prose-sm focus:outline-none px-2 pb-2 min-h-32'
				}
			},
			onUpdate: ({ editor }) => {
				editContent = editor.getJSON();
			}
		});
	}

	function openCreateModal() {
		editingId = null;
		editName = '';
		editContent = { type: 'doc', content: [{ type: 'paragraph' }] };
		initEditor(editContent);
		isEditing = true;
	}

	function openEditModal(snippet: { id: string; name: string; content: unknown }) {
		editingId = snippet.id;
		editName = snippet.name;
		// Validate content before using it, fallback to empty document if invalid
		editContent = isValidTipTapContent(snippet.content)
			? (snippet.content as JSONContent)
			: getEmptyTipTapDocument();
		initEditor(editContent);
		isEditing = true;
	}

	function closeModal() {
		isEditing = false;
		editingId = null;
		editName = '';
		if (editor) {
			$editor?.destroy();
		}
		editor = undefined;
	}

	async function handleSave() {
		if (!editName.trim()) {
			toast.error(m.snippetNameRequired());
			return;
		}

		// Check if content has actual text (recursively checks all node types)
		function hasTextNode(node: JSONContent): boolean {
			if (node.type === 'text' && node.text?.trim()) {
				return true;
			}
			if (node.content && Array.isArray(node.content)) {
				return node.content.some(hasTextNode);
			}
			return false;
		}

		const hasContent = editContent.content?.some(hasTextNode) ?? false;

		if (!hasContent) {
			toast.error(m.snippetContentRequired());
			return;
		}

		// Validate placeholders
		const validation = validatePlaceholders(editContent);

		if (validation.malformed.length > 0) {
			toast.error(m.malformedPlaceholders());
			return;
		}

		if (validation.empty.length > 0) {
			toast.error(m.emptyPlaceholders());
			return;
		}

		if (validation.tooLong.length > 0) {
			toast.error(m.placeholderTooLong());
			return;
		}

		// Show detected placeholders as info
		if (validation.valid.length > 0) {
			toast.success(m.detectedPlaceholders());
		}

		try {
			if (editingId) {
				// Update existing
				await updateMutation.mutate({
					id: editingId,
					name: editName.trim(),
					content: editContent
				});
				toast.success(m.snippetSaved());
			} else {
				// Create new
				await createMutation.mutate({
					name: editName.trim(),
					content: editContent
				});
				toast.success(m.snippetSaved());
			}
			closeModal();
			cache.markStale();
			await invalidateAll();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : m.genericError();
			toast.error(message);
		}
	}

	function confirmDelete(snippet: { id: string; name: string }) {
		deletingSnippet = snippet;
		deleteConfirmOpen = true;
	}

	async function handleDelete() {
		if (!deletingSnippet) return;

		try {
			await deleteMutation.mutate({ id: deletingSnippet.id });
			toast.success(m.snippetDeleted());
			deleteConfirmOpen = false;
			deletingSnippet = null;
			cache.markStale();
			await invalidateAll();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : m.genericError();
			toast.error(message);
		}
	}
</script>

<div class="flex flex-col gap-6 w-full">
	<!-- Header -->
	<div class="flex flex-col gap-2">
		<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
			<div>
				<h2 class="text-2xl font-bold">{m.reviewerSnippets()}</h2>
				<p class="text-base-content/70">{m.reviewerSnippetsDescription()}</p>
			</div>
			<button class="btn btn-primary" onclick={openCreateModal}>
				<i class="fa-solid fa-plus"></i>
				{m.createSnippet()}
			</button>
		</div>
	</div>

	<!-- Help Section -->
	<div class="collapse collapse-arrow bg-base-200">
		<input type="checkbox" />
		<div class="collapse-title font-medium flex items-center gap-2">
			<i class="fa-solid fa-circle-question"></i>
			{m.snippetHelpTitle()}
		</div>
		<div class="collapse-content overflow-hidden">
			<div class="prose prose-sm max-w-none break-words">
				<h4>{m.snippetHelpCreating()}</h4>
				<ul>
					<li class="break-words">{m.snippetHelpCreatingStep1()}</li>
					<li class="break-words">{m.snippetHelpCreatingStep2()}</li>
					<li class="break-words">{m.snippetHelpCreatingStep3()}</li>
				</ul>

				<h4>{m.snippetHelpPlaceholders()}</h4>
				<p class="break-words">{m.snippetHelpPlaceholdersDescription()}</p>
				<div class="mockup-code text-sm overflow-x-auto">
					<pre class="whitespace-pre-wrap break-all"><code>{m.snippetHelpPlaceholderExample()}</code
						></pre>
				</div>

				<h4>{m.snippetHelpUsing()}</h4>
				<ul>
					<li class="break-words">
						<strong>{m.snippetHelpSlashCommand()}</strong>: {m.snippetHelpSlashCommandDescription()}
					</li>
					<li class="break-words">
						<strong>{m.snippetHelpDropdown()}</strong>: {m.snippetHelpDropdownDescription()}
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Snippets List -->
	<div class="bg-base-200 rounded-box p-4">
		{#if snippets.length === 0}
			<div class="text-center py-8 text-base-content/50">
				<i class="fa-solid fa-bookmark text-4xl mb-4"></i>
				<p>{m.noSnippetsYet()}</p>
				<button class="btn btn-primary btn-sm mt-4" onclick={openCreateModal}>
					{m.createFirstSnippet()}
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table w-full">
					<thead>
						<tr>
							<th>{m.snippetName()}</th>
							<th class="hidden md:table-cell">{m.snippetPreview()}</th>
							<th class="hidden sm:table-cell">{m.snippetUpdatedAt()}</th>
							<th class="text-right">{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each snippets as snippet}
							{@const contentPreview = getContentPreview(snippet.content)}
							<tr>
								<td class="font-medium">
									<div class="flex items-center gap-2">
										<i class="fa-solid fa-bookmark text-primary"></i>
										{snippet.name}
									</div>
								</td>
								<td class="hidden md:table-cell">
									<span class="text-base-content/60 truncate max-w-xs block">
										{contentPreview}
									</span>
								</td>
								<td class="hidden sm:table-cell text-base-content/60">
									{new Date(snippet.updatedAt).toLocaleDateString()}
								</td>
								<td>
									<div class="flex justify-end gap-2">
										<button
											class="btn btn-ghost btn-sm"
											onclick={() => openEditModal(snippet)}
											aria-label={m.editSnippet()}
										>
											<i class="fa-solid fa-pen"></i>
										</button>
										<button
											class="btn btn-ghost btn-sm text-error"
											onclick={() => confirmDelete(snippet)}
											aria-label={m.deleteSnippet()}
										>
											<i class="fa-solid fa-trash"></i>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Edit/Create Modal -->
<Modal
	bind:open={isEditing}
	title={editingId ? m.editSnippet() : m.createSnippet()}
	onclose={closeModal}
>
	<div class="flex flex-col gap-4">
		<!-- Name fieldset -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
			<legend class="fieldset-legend">{m.snippetName()}</legend>
			<input
				id="snippet-name"
				type="text"
				class="input input-bordered w-full"
				bind:value={editName}
				placeholder={m.snippetNamePlaceholder()}
			/>
			<p class="text-xs text-base-content/60 mt-2 break-words">{m.snippetNameHint()}</p>
		</fieldset>

		<!-- Content fieldset (editor) -->
		<fieldset
			class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 min-h-[200px]"
		>
			<legend class="fieldset-legend">{m.snippetContent()}</legend>
			{#if $editor}
				<Menu.Wrapper>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleHeading({ level: 2 }).run()}
						active={$editor.isActive('heading', { level: 2 })}
						label={m.heading2()}
						icon="fa-heading"
					/>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleHeading({ level: 3 }).run()}
						active={$editor.isActive('heading', { level: 3 })}
						label={m.heading3()}
						icon="fa-h"
					/>

					<Menu.Divider />

					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleBold().run()}
						active={$editor.isActive('bold')}
						label={m.bold()}
						icon="fa-bold"
					/>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleItalic().run()}
						active={$editor.isActive('italic')}
						label={m.italic()}
						icon="fa-italic"
					/>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleUnderline().run()}
						active={$editor.isActive('underline')}
						label={m.underline()}
						icon="fa-underline"
					/>

					<Menu.Divider />

					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleBulletList().run()}
						active={$editor.isActive('bulletList')}
						label={m.bulletList()}
						icon="fa-list"
					/>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleOrderedList().run()}
						active={$editor.isActive('orderedList')}
						label={m.orderedList()}
						icon="fa-list-ol"
					/>
					<Menu.Button
						onClick={() => $editor?.chain().focus().toggleBlockquote().run()}
						active={$editor.isActive('blockquote')}
						label={m.blockquote()}
						icon="fa-quote-left"
					/>
				</Menu.Wrapper>
				<div class="prose prose-sm max-w-none focus:outline-none px-2 pb-2 min-h-32">
					<EditorContent editor={$editor} />
				</div>
			{/if}
			<p class="text-xs text-base-content/60 mt-2 break-words">{m.snippetPlaceholderHelp()}</p>
		</fieldset>
	</div>

	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={closeModal}>{m.cancel()}</button>
			<button class="btn btn-primary" onclick={handleSave}>
				<i class="fa-solid fa-save"></i>
				{m.save()}
			</button>
		</div>
	{/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteConfirmOpen} title={m.deleteSnippet()}>
	<p>{m.deleteSnippetConfirmation({ name: deletingSnippet?.name ?? '' })}</p>

	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</button>
			<button class="btn btn-error" onclick={handleDelete}>
				<i class="fa-solid fa-trash"></i>
				{m.delete()}
			</button>
		</div>
	{/snippet}
</Modal>
