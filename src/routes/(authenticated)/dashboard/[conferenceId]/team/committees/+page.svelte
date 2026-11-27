<script lang="ts">
	import { untrack } from 'svelte';
	import CommitteesManager from './CommitteesManager.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);
</script>

<div class="flex w-full flex-col gap-10 py-4 sm:p-10">
	<CommitteesManager {conferenceId} />
</div>
