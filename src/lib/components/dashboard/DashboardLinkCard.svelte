<script lang="ts">
	import type { DashboardHref } from '#lib/data/dashboardLinks';
	import type { Snippet } from 'svelte';

	interface Props {
		href: DashboardHref;
		icon: string;
		title: string;
		description: string;
		external?: boolean;
		disabled?: boolean;
		badge?: string | number;
		badgeType?: 'info' | 'warning' | 'success' | 'error';
		important?: boolean;
		/** Live details shown under the description, such as what is on right now */
		info?: Snippet;
	}

	let {
		href,
		icon,
		title,
		description,
		external = false,
		disabled = false,
		badge,
		badgeType = 'info',
		important = false,
		info
	}: Props = $props();

	// Split once so each branch below gets a plainly typed value.
	const externalUrl = $derived(typeof href === 'object' ? href.externalUrl : undefined);
	const internalHref = $derived(typeof href === 'object' ? undefined : href);

	const badgeClasses: Record<string, string> = {
		info: 'badge-info',
		warning: 'badge-warning',
		success: 'badge-success',
		error: 'badge-error'
	};
</script>

{#if disabled}
	<div class="card bg-base-200 cursor-not-allowed opacity-50">
		<div class="card-body max-sm:p-4">
			<div class="flex items-center gap-3">
				<i
					class="fa-sharp-duotone fa-solid fa-{icon.replace(
						'fa-',
						''
					)} text-2xl text-base-content/50"
				></i>
				<h2 class="card-title">{title}</h2>
				{#if badge !== undefined}
					<span class="badge {badgeClasses[badgeType]}">{badge}</span>
				{/if}
			</div>
			<p class="text-base-content/50">{description}</p>
		</div>
	</div>
{:else if externalUrl !== undefined}
	<a
		href={externalUrl}
		class="card bg-base-200 hover:bg-base-300 transition-colors {important
			? 'ring-2 ring-warning/40 bg-warning/5'
			: ''}"
		target="_blank"
		rel="external noopener noreferrer"
	>
		{@render body()}
	</a>
{:else}
	<a
		href={internalHref}
		class="card bg-base-200 hover:bg-base-300 transition-colors {important
			? 'ring-2 ring-warning/40 bg-warning/5'
			: ''}"
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
	>
		{@render body()}
	</a>
{/if}

{#snippet body()}
	<div class="card-body max-sm:p-4">
		<div class="flex items-center gap-3">
			<i class="fa-sharp-duotone fa-solid fa-{icon.replace('fa-', '')} text-primary text-2xl"></i>
			<h2 class="card-title min-w-0 break-words">{title}</h2>
			{#if badge !== undefined}
				<span class="badge {badgeClasses[badgeType]}">{badge}</span>
			{/if}
			{#if external}
				<i
					class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square text-xs text-base-content/50"
				></i>
			{/if}
		</div>
		<p class="text-base-content/70">{description}</p>
		{@render info?.()}
	</div>
{/snippet}
