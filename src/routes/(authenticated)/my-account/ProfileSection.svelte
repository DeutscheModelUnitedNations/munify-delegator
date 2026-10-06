<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * One group of the profile form: icon, title and an optional hint on the left, the fields on the
	 * right. Sections are separated by a rule rather than boxed, so the card holds no nested cards.
	 */
	interface Props {
		title: string;
		/** FontAwesome duotone icon name without the `fa-` prefix. */
		icon: string;
		description?: string;
		children: Snippet;
	}

	let { title, icon, description, children }: Props = $props();

	const headingId = $props.id();
</script>

<section
	class="border-base-300 grid grid-cols-1 gap-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8"
	aria-labelledby={headingId}
>
	<div class="flex gap-3">
		<div
			class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full"
		>
			<i class="fa-duotone fa-{icon}"></i>
		</div>
		<div class="flex flex-col gap-1">
			<h3 id={headingId} class="font-semibold">{title}</h3>
			{#if description}
				<p class="text-base-content/60 text-xs">{description}</p>
			{/if}
		</div>
	</div>
	<div class="fieldset gap-y-2 p-0">
		{@render children()}
	</div>
</section>
