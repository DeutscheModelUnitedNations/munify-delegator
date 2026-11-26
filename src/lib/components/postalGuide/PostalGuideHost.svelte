<!--
	@component
	Renders the postal guide while something asks for it (`#lib/state/postalGuide`). Loaded only then:
	hardly anybody sees it more than once.
-->
<script lang="ts">
	import { postalGuide } from '#lib/state/postalGuide.svelte.js';

	const loadModal = () => import('./PostalGuideModal.svelte');
</script>

{#if postalGuide.current}
	{#await loadModal() then { default: PostalGuideModal }}
		<PostalGuideModal />
	{/await}
{/if}
