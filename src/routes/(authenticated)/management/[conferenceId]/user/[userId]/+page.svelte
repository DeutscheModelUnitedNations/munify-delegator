<script lang="ts">
	import UserCardContent from '$lib/components/UserCard/UserCardContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{m.adminUserCard()}</title>
</svelte:head>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<div class="mb-3 flex items-center gap-2">
		<a href="/management/{data.conferenceId}/participants" class="btn btn-ghost btn-sm">
			<i class="fa-duotone fa-arrow-left"></i>
			{m.back()}
		</a>
		<h1 class="text-xl font-bold">{m.adminUserCard()}</h1>
	</div>
	<div class="bg-base-100 min-h-0 flex-1 overflow-hidden rounded-lg shadow-lg">
		<UserCardContent userId={data.userId} conferenceId={data.conferenceId} mode="page" />
	</div>
</div>
