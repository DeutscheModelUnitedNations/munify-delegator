<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { m } from '$lib/paraglide/messages';
	import Spinner from '../Spinner.svelte';
	import type { SuperForm } from 'sveltekit-superforms';

	interface Props {
		disabled: boolean;
		loading: boolean;
		form: SuperForm<A, B>;
	}

	let { disabled, loading, form }: Props = $props();
	let { validateForm } = $derived(form);
</script>

<div class="{!disabled ? 'sticky bottom-4 shadow-sm' : ''} mt-6 w-full">
	<button
		onclick={async (e) => {
			const val = await validateForm({ update: true });
			if (!val.valid) {
				e.preventDefault();
			}
		}}
		disabled={disabled || loading}
		class="btn btn-primary w-full"
		>{m.save()}

		{#if loading}
			<Spinner />
		{/if}
	</button>
</div>
