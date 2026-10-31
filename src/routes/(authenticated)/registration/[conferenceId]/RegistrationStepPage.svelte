<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';

	/**
	 * The frame of a registration page outside the dashboard's application form: a way back, and the
	 * page's own content in a section like the dashboard's.
	 */
	interface Props {
		conferenceId: string;
		icon: string;
		title: string;
		description?: string;
		/** Where "back" leads; the conference's dashboard by default. */
		backHref?: ResolvedPathname;
		/** A heading instead of a card, for content that brings its own cards. */
		bare?: boolean;
		children: Snippet;
	}

	let {
		conferenceId,
		icon,
		title,
		description,
		backHref,
		bare = false,
		children
	}: Props = $props();
</script>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-16">
	<a
		class="btn btn-ghost btn-sm self-start"
		href={backHref ?? resolve(`dashboard/${conferenceId}`)}
	>
		<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
		{m.back()}
	</a>

	{#if bare}
		<header class="flex items-start gap-4">
			<span
				class="bg-primary/10 text-primary rounded-box flex size-12 shrink-0 items-center justify-center text-xl"
			>
				<i class="fa-sharp-duotone fa-solid fa-{icon}"></i>
			</span>
			<div>
				<h1 class="text-xl font-bold">{title}</h1>
				{#if description}
					<p class="text-base-content/60 mt-1 text-sm">{description}</p>
				{/if}
			</div>
		</header>
		{@render children()}
	{:else}
		<DashboardSection {icon} {title} {description}>
			{@render children()}
		</DashboardSection>
	{/if}
</main>
