<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: string;
		title: string;
		description?: string;
		children: Snippet;
		class?: string;
	}

	let { icon, title, description, children, class: class_ = '' }: Props = $props();
</script>

<section class="card bg-base-100 border-base-200 border shadow-sm {class_}">
	<div class="card-body">
		<div class="mb-4 flex items-start gap-4">
			<div
				class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-3"
			>
				<i class="fa-duotone fa-{icon} text-xl"></i>
			</div>
			<div>
				<h2 class="card-title text-lg">{title}</h2>
				{#if description}
					<p class="text-base-content/60 mt-1 text-sm">{description}</p>
				{/if}
			</div>
		</div>
		{@render children()}
	</div>
</section>
