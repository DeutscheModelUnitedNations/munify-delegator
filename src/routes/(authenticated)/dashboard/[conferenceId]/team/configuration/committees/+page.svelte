<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import CommitteesManager from './CommitteesManager.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<div class="flex w-full flex-col gap-10 py-4 sm:p-10">
	<CommitteesManager conferenceId={params.conferenceId} />
</div>
