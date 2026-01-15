<script lang="ts">
	import type { Snippet } from 'svelte';

	// Import only the essential styles - no layout components
	import '../../../../../../../app.css';
	import 'flag-icons/css/flag-icons.min.css';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- Minimal layout for print pages - no nav, no footer, no banners -->
{@render children()}
