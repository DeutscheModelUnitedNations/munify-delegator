<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import DiffPanel from './DiffPanel.svelte';
	import { computeDiff, areContentsEqual } from './diffUtils';
	import type { VersionForComparison } from './types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		baseVersion: VersionForComparison;
		compareVersion: VersionForComparison;
	}

	let { open = $bindable(), baseVersion, compareVersion }: Props = $props();

	// Sort versions so lower version number is always "before"
	let sortedVersions = $derived.by(() => {
		if (!baseVersion || !compareVersion) return null;

		const isBaseOlder = baseVersion.version < compareVersion.version;
		return {
			before: isBaseOlder ? baseVersion : compareVersion,
			after: isBaseOlder ? compareVersion : baseVersion
		};
	});

	let diffResult = $derived.by(() => {
		if (!sortedVersions) return null;
		return computeDiff(sortedVersions.before.content, sortedVersions.after.content);
	});

	let noChanges = $derived.by(() => {
		if (!sortedVersions) return false;
		return areContentsEqual(sortedVersions.before.content, sortedVersions.after.content);
	});
</script>

<Modal bind:open title={m.compareVersions()} fullWidth>
	{#if diffResult && sortedVersions}
		{#if noChanges}
			<div class="alert alert-info mb-4">
				<i class="fa-solid fa-info-circle"></i>
				<span>{m.noChangesBetweenVersions()}</span>
			</div>
		{/if}

		<div class="flex flex-col lg:flex-row gap-4">
			<div class="flex-1 min-w-0">
				<DiffPanel
					title={m.before()}
					versionNumber={sortedVersions.before.version}
					date={new Date(sortedVersions.before.createdAt)}
					segments={diffResult.beforeSegments}
				/>
			</div>
			<div class="flex-1 min-w-0">
				<DiffPanel
					title={m.after()}
					versionNumber={sortedVersions.after.version}
					date={new Date(sortedVersions.after.createdAt)}
					segments={diffResult.afterSegments}
				/>
			</div>
		</div>
	{:else}
		<div class="flex items-center justify-center p-8">
			<i class="fa-duotone fa-spinner fa-spin text-2xl"></i>
		</div>
	{/if}

	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>
			{m.close()}
		</button>
	{/snippet}
</Modal>
