<script lang="ts">
	import type { PaperstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Save and submit for whoever may edit the paper (its author, or a reviewer who switched to
	 * edit mode), and the reviewer's switch between viewing and editing.
	 */
	interface Props {
		status: PaperstatusEnum;
		viewMode: 'author' | 'reviewer';
		isReviewer: boolean;
		reviewerEditMode: boolean;
		unsavedChanges: boolean;
		onSave: (submit: boolean) => void;
	}

	let {
		status,
		viewMode,
		isReviewer,
		reviewerEditMode = $bindable(),
		unsavedChanges,
		onSave
	}: Props = $props();

	const isDraft = $derived(status === 'DRAFT');
</script>

<div class="card bg-base-100 border border-base-300">
	<div class="card-body p-3 flex-row items-center justify-between flex-wrap gap-2">
		<!-- Author/Edit Actions (Left) -->
		<div class="flex gap-2">
			{#if viewMode === 'author' || reviewerEditMode}
				{#if isDraft}
					<button
						class="btn btn-warning btn-sm"
						onclick={() => onSave(false)}
						disabled={!unsavedChanges}
					>
						<i class="fa-sharp-duotone fa-solid fa-save"></i>
						{m.paperSaveDraft()}
					</button>
				{/if}
				<button
					class="btn btn-primary btn-sm"
					onclick={() => onSave(true)}
					disabled={!unsavedChanges && !isDraft}
				>
					<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
					{isDraft ? m.paperSubmit() : m.paperResubmit()}
				</button>
			{/if}
		</div>

		<!-- Reviewer Toggle (Right) -->
		{#if isReviewer && viewMode === 'reviewer'}
			<div class="flex gap-2">
				<button
					class="btn btn-sm {reviewerEditMode ? 'btn-warning' : 'btn-ghost'}"
					onclick={() => (reviewerEditMode = !reviewerEditMode)}
				>
					<i class="fa-sharp-duotone fa-solid {reviewerEditMode ? 'fa-eye' : 'fa-pen-to-square'}"
					></i>
					{reviewerEditMode ? m.viewer() : m.edit()}
				</button>
			</div>
		{/if}
	</div>
</div>
