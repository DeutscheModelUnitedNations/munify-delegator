<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		icon: string;
		children: Snippet;
	}

	let { title, description, icon, children }: Props = $props();
</script>

<section class="card bg-base-100 border-base-200 overflow-hidden border shadow-sm">
	<header class="bg-base-200/40 border-base-200 flex items-center gap-4 border-b px-6 py-5">
		<div
			class="from-primary/25 to-primary/5 text-primary rounded-box flex size-12 shrink-0 items-center justify-center bg-gradient-to-br"
		>
			<i class="{icon} text-xl"></i>
		</div>
		<div class="min-w-0">
			<h3 class="text-lg leading-tight font-semibold">{title}</h3>
			<p class="text-base-content/60 mt-0.5 text-sm">{description}</p>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
		{@render children()}
	</div>
</section>
