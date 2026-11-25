<!--
	@component
	A laptop that shows a page, which spans 142 to 258 and 48 to 160 of the stage.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	/** What is on the page. */
	let { children }: { children: Snippet } = $props();
</script>

<rect x="104" y="30" width="192" height="138" rx="8" class="case" />
<rect x="112" y="38" width="176" height="122" rx="3" class="display" />
<path d="M142 48H258V160H142Z" class="paper" />
<path d="M84 168H316L326 186Q328 192 320 192H80Q72 192 74 186Z" class="base" />
<path d="M176 168h48l-4 7h-40Z" class="touchpad" />
{@render children()}

<style>
	.case,
	.touchpad {
		fill: #475467;
	}

	/* Dark in every theme, like the screen of a device */
	.display {
		fill: #101828;
	}

	.base {
		fill: #667085;
	}

	.paper {
		fill: var(--paper);
	}
</style>
