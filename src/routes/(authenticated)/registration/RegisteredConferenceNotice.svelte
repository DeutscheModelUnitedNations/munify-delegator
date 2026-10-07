<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';

	let { conference }: { conference: { id: string; title: string } } = $props();
</script>

<div
	class="bg-base-100 border-base-300 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border px-5 py-3"
>
	<span class="flex items-center gap-3">
		<i class="fa-duotone fa-circle-check text-primary text-lg"></i>
		{m.alreadyRegisteredForConference({ conference: conference.title })}
	</span>
	<a
		href={resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId: conference.id })}
		class="btn btn-ghost text-primary"
	>
		{m.goToDashboard()}
		<i class="fa-duotone fa-arrow-right"></i>
	</a>
</div>
