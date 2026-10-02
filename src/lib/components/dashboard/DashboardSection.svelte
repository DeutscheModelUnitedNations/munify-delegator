<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: string;
		title: string;
		description?: string;
		children: Snippet;
		class?: string;
		variant?: 'default' | 'info';
		headerAction?: Snippet;
		collapsible?: boolean;
		defaultCollapsed?: boolean;
		collapsed?: boolean;
	}

	let {
		icon,
		title,
		description,
		children,
		class: class_ = '',
		variant = 'default',
		headerAction,
		collapsible = false,
		defaultCollapsed = false,
		collapsed = $bindable(defaultCollapsed)
	}: Props = $props();

	const cardClasses = $derived(
		variant === 'info'
			? 'card bg-info/10 border-info/30 border shadow-sm'
			: 'card bg-base-100 border-base-200 border shadow-sm'
	);

	const iconClasses = $derived(
		variant === 'info'
			? 'bg-info/20 text-info flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-3'
			: 'bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-3'
	);
</script>

<section class="{cardClasses} {class_}">
	<div class="card-body">
		{#snippet header()}
			<div class={iconClasses}>
				<i class="fa-duotone fa-{icon} text-xl"></i>
			</div>
			<div class="flex-1">
				<div class="flex items-center justify-between">
					<h2 class="card-title text-lg">{title}</h2>
					<div class="flex items-center gap-2">
						{#if headerAction}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div onclick={(e: MouseEvent) => e.stopPropagation()}>
								{@render headerAction()}
							</div>
						{/if}
						{#if collapsible}
							<div class="btn btn-ghost btn-sm btn-circle text-base-content/60">
								<i
									class="fa-duotone fa-chevron-down transition-transform duration-200 {collapsed
										? '-rotate-90'
										: ''}"
								></i>
							</div>
						{/if}
					</div>
				</div>
				{#if description}
					<p class="text-base-content/60 mt-1 text-sm">{description}</p>
				{/if}
			</div>
		{/snippet}
		{#if collapsible}
			<div
				class="flex cursor-pointer items-start gap-4 select-none"
				class:mb-4={!collapsed}
				role="button"
				tabindex="0"
				aria-expanded={!collapsed}
				onclick={() => (collapsed = !collapsed)}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						collapsed = !collapsed;
					}
				}}
			>
				{@render header()}
			</div>
		{:else}
			<div class="flex items-start gap-4" class:mb-4={!collapsed}>
				{@render header()}
			</div>
		{/if}
		{#if !collapsed}
			{@render children()}
		{/if}
	</div>
</section>
