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
	}

	let {
		icon,
		title,
		description,
		children,
		class: class_ = '',
		variant = 'default',
		headerAction
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
		<div class="mb-4 flex items-start gap-4">
			<div class={iconClasses}>
				<i class="fa-duotone fa-{icon} text-xl"></i>
			</div>
			<div class="flex-1">
				<div class="flex items-center justify-between">
					<h2 class="card-title text-lg">{title}</h2>
					{#if headerAction}
						{@render headerAction()}
					{/if}
				</div>
				{#if description}
					<p class="text-base-content/60 mt-1 text-sm">{description}</p>
				{/if}
			</div>
		</div>
		{@render children()}
	</div>
</section>
