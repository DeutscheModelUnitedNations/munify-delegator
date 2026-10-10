<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import AccentStripe from '$lib/components/AccentStripe.svelte';

	interface Props {
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();
</script>

<header class="flex flex-col gap-4 pt-6">
	<AccentStripe />
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<h1 class="text-4xl font-bold tracking-tight">{m.conferences()}</h1>
			<p class="text-base-content/70 max-w-xl">{m.conferenceSelectorIntro()}</p>
		</div>
		{#if isAdmin}
			<a class="btn btn-primary btn-lg shrink-0 gap-2" href={resolve('/dashboard/seed')}>
				<i class="fa-sharp-duotone fa-solid fa-plus text-2xl"></i>
				{m.seedConference()}
			</a>
		{/if}
	</div>
</header>
