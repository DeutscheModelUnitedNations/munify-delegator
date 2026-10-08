<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import Markdown from '$lib/components/markdown/Markdown.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Seeded once and then owned by the form: a refetch must not overwrite what is being typed.
	const announcement = await client.query.conference({
		__args: { id: untrack(() => params.conferenceId) },
		info: true,
		showInfoExpanded: true
	});

	let info = $state(announcement?.info ?? '');
	let showInfoExpanded = $state(announcement?.showInfoExpanded ?? false);
	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			await client.mutate.updateConference({
				__args: { id: params.conferenceId, info, showInfoExpanded },
				id: true
			});
			toast.success(m.saved());
		} finally {
			saving = false;
		}
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-box">
	<p class="opacity-70">{m.announcementSectionDescription()}</p>

	<div class="alert alert-info mb-6">
		<i class="fas fa-circle-info"></i>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<span>{@html m.markdownSyntaxHint()}</span>
	</div>

	<FormFieldset title={m.infos()}>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- Editor side -->
			<div class="flex flex-col gap-2 min-w-0">
				<label class="label" for="announcement-info">
					<span class="label-text">{m.infos()}</span>
				</label>
				<textarea
					id="announcement-info"
					class="textarea textarea-bordered h-96 w-full font-mono text-sm"
					bind:value={info}
					placeholder={m.markdownSupportedPlaceholder()}></textarea>
			</div>
			<!-- Preview side -->
			<div class="flex flex-col gap-2 min-w-0">
				<div class="label">
					<span class="label-text">{m.preview()}</span>
				</div>
				<div
					class="bg-base-200 rounded-box p-4 h-96 w-full overflow-auto prose prose-sm max-w-none"
				>
					<Markdown source={info} />
				</div>
			</div>
		</div>

		<label class="label cursor-pointer justify-start gap-3 mt-4">
			<input type="checkbox" class="toggle toggle-primary" bind:checked={showInfoExpanded} />
			<span class="label-text">{m.showInfoExpandedLabel()}</span>
		</label>
		<p class="text-xs opacity-50 mt-1">{m.showInfoExpandedDescription()}</p>
	</FormFieldset>

	<div class="mt-6">
		<button class="btn btn-primary" onclick={save} disabled={saving}>
			{#if saving}
				<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-save"></i>
			{/if}
			{m.save()}
		</button>
	</div>
</div>
