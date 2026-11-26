<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	/** Leads the signed-in person to their profile, and back to this page once it is saved. */
	interface Props {
		label: string;
		class: string;
	}

	let { label, class: className }: Props = $props();

	// The account page only follows its own origin
	const href = $derived(
		resolve(`my-account?redirect=${encodeURIComponent(`${page.url.origin}${page.url.pathname}`)}`)
	);
</script>

<a class={className} {href}>
	<i aria-hidden="true" class="ph-fill ph-pencil-simple-line"></i>
	{label}
</a>
