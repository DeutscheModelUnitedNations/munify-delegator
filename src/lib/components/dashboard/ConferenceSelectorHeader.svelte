<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import AccentStripe from '#lib/components/AccentStripe.svelte';

	interface Props {
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();
</script>

<header class="flex flex-col gap-4 pt-6">
	<AccentStripe />
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row">
		<div class="flex flex-col gap-4">
			<h1 class="text-4xl font-bold tracking-tight">{m.conferences()}</h1>
			<p class="text-base-content/70 max-w-xl">{m.conferenceSelectorIntro()}</p>
		</div>
		{#if isAdmin}
			<div class="flex shrink-0 flex-col gap-2 max-sm:w-full sm:flex-row">
				<a class="btn btn-ghost sm:btn-lg gap-2" href={resolve('dashboard/chase-link')}>
					<i class="fa-sharp-duotone fa-solid fa-link sm:text-2xl"></i>
					{m.chaseLinkTitle()}
				</a>
				<a class="btn btn-primary sm:btn-lg gap-2" href={resolve('dashboard/create')}>
					<i class="fa-sharp-duotone fa-solid fa-plus sm:text-2xl"></i>
					{m.seedConference()}
				</a>
			</div>
		{/if}
	</div>
</header>
