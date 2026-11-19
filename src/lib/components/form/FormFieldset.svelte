<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** A pictogram shown before the title. */
		icon?: Snippet;
		/** A group within a larger surface: no frame of its own, the title a small heading. */
		plain?: boolean;
		children: Snippet;
	}

	let { title, icon, plain = false, children }: Props = $props();
</script>

<fieldset
	class={[
		'fieldset w-full',
		plain ? 'min-w-0 gap-3 p-0' : 'bg-base-200 border-base-300 rounded-box border p-4'
	]}
>
	<legend
		class={[
			'fieldset-legend',
			plain &&
				'text-base-content/60 mb-1 gap-1.5 pt-0 text-xs font-semibold tracking-wide uppercase'
		]}
	>
		{#if icon}{@render icon()}{/if}
		{title}
	</legend>
	{@render children()}
</fieldset>
