<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import CommitteesManager from './CommitteesManager.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<CommitteesManager conferenceId={params.conferenceId} />
</div>
