<script lang="ts">
	interface Props {
		href: string;
		icon: string;
		title: string;
		description: string;
		external?: boolean;
		disabled?: boolean;
		badge?: string | number;
		badgeType?: 'info' | 'warning' | 'success' | 'error';
	}

	let {
		href,
		icon,
		title,
		description,
		external = false,
		disabled = false,
		badge,
		badgeType = 'info'
	}: Props = $props();

	const badgeClasses: Record<string, string> = {
		info: 'badge-info',
		warning: 'badge-warning',
		success: 'badge-success',
		error: 'badge-error'
	};
</script>

{#if disabled}
	<div class="card bg-base-200 cursor-not-allowed opacity-50">
		<div class="card-body">
			<div class="flex items-center gap-3">
				<i class="fa-duotone fa-{icon.replace('fa-', '')} text-2xl text-base-content/50"></i>
				<h2 class="card-title">{title}</h2>
				{#if badge !== undefined}
					<span class="badge {badgeClasses[badgeType]}">{badge}</span>
				{/if}
			</div>
			<p class="text-base-content/50">{description}</p>
		</div>
	</div>
{:else}
	<a
		{href}
		class="card bg-base-200 hover:bg-base-300 transition-colors"
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
	>
		<div class="card-body">
			<div class="flex items-center gap-3">
				<i class="fa-duotone fa-{icon.replace('fa-', '')} text-primary text-2xl"></i>
				<h2 class="card-title">{title}</h2>
				{#if badge !== undefined}
					<span class="badge {badgeClasses[badgeType]}">{badge}</span>
				{/if}
				{#if external}
					<i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/50"></i>
				{/if}
			</div>
			<p class="text-base-content/70">{description}</p>
		</div>
	</a>
{/if}
