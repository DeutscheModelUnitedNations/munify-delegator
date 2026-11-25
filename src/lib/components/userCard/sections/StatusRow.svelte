<script lang="ts" generics="S">
	import type { Snippet } from 'svelte';
	import Row from '../ui/Row.svelte';
	import StateMenu, { type StatusOption } from '../ui/StateMenu.svelte';

	/**
	 * One status of a person as a row of a `Section`: its state, changed in a menu, and while it is open
	 * the button that settles it. The postal registration page keeps the large `StatusWidget` for quick
	 * clicking.
	 */
	interface Props {
		title: string;
		icon: string;
		active: S;
		options: StatusOption<S>[];
		change: (status: S) => Promise<void>;
		/** Beside the state */
		extra?: Snippet;
	}

	let { title, icon, active, options, change, extra }: Props = $props();

	/** The state that settles it, if it is not settled */
	const done = $derived(
		options.find((option) => option.tone === 'success' && option.value !== active)
	);

	let pending = $state(false);

	async function select(value: S) {
		pending = true;
		try {
			await change(value);
		} finally {
			pending = false;
		}
	}
</script>

{#snippet settle()}
	{#if done}
		{@const option = done}
		<button
			class="btn btn-sm btn-soft"
			aria-label="{title}: {option.label}"
			disabled={pending}
			onclick={() => select(option.value)}
		>
			<i
				aria-hidden="true"
				class={pending ? 'ph-fill ph-spinner-gap animate-spin' : 'ph-duotone ph-check-circle'}
			></i>
			{option.label}
		</button>
	{/if}
{/snippet}

<Row {icon} {title} actions={done ? settle : undefined}>
	<span class="flex flex-wrap items-center gap-x-3">
		<StateMenu name={title} {active} {options} disabled={pending} onSelect={select} />
		{@render extra?.()}
	</span>
</Row>
