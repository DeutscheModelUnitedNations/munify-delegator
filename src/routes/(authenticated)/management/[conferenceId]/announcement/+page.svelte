<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cache, graphql } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Markdown from '$lib/components/Markdown/Markdown.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let info = $state(data.info);
	let showInfoExpanded = $state(data.showInfoExpanded);
	let saving = $state(false);

	const UpdateAnnouncementMutation = graphql(`
		mutation UpdateAnnouncementMutation(
			$where: ConferenceWhereUniqueInput!
			$data: ConferenceUpdateDataInput!
		) {
			updateOneConference(data: $data, where: $where) {
				id
			}
		}
	`);

	async function save() {
		saving = true;
		try {
			await UpdateAnnouncementMutation.mutate({
				where: { id: data.conferenceId },
				data: { info, showInfoExpanded }
			});
			cache.markStale();
			await invalidateAll();
			toast.success(m.saved());
		} finally {
			saving = false;
		}
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-2xl">
	<h1 class="text-2xl font-bold">{m.announcementSectionTitle()}</h1>
	<p class="opacity-70">{m.announcementSectionDescription()}</p>

	<div class="alert alert-info mb-6">
		<i class="fas fa-circle-info"></i>
		<span>{@html m.markdownSyntaxHint()}</span>
	</div>

	<FormFieldset title={m.infos()}>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- Editor side -->
			<div class="flex flex-col gap-2 min-w-0">
				<label class="label">
					<span class="label-text">{m.infos()}</span>
				</label>
				<textarea
					class="textarea textarea-bordered h-96 w-full font-mono text-sm"
					bind:value={info}
					placeholder={m.markdownSupportedPlaceholder()}
				></textarea>
			</div>
			<!-- Preview side -->
			<div class="flex flex-col gap-2 min-w-0">
				<label class="label">
					<span class="label-text">{m.preview()}</span>
				</label>
				<div class="bg-base-200 rounded-lg p-4 h-96 w-full overflow-auto prose prose-sm max-w-none">
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
				<i class="fa-duotone fa-spinner fa-spin"></i>
			{:else}
				<i class="fa-solid fa-save"></i>
			{/if}
			{m.save()}
		</button>
	</div>
</div>
