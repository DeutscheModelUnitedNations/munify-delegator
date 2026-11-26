<!-- The scanner takes in a pile, page after page. -->
<script lang="ts">
	import Feed from './Feed.svelte';
	import Scanner from './Scanner.svelte';
	import Scene from './Scene.svelte';
	import Sheet from './Sheet.svelte';

	const PAGES = [0, 1, 2, 3];
</script>

<Scene>
	<g transform="translate(-124 0)">
		<Feed>
			{#each PAGES as page (page)}
				<g class="page" style:--start={page / PAGES.length}><Sheet x={289} y={-112} /></g>
			{/each}
		</Feed>
		<Scanner runs="well" />
	</g>
</Scene>

<style>
	/* One after the other, a page every quarter of the loop */
	.page {
		animation: in var(--scene) calc(var(--scene) * var(--start)) infinite both;
	}

	@keyframes in {
		0% {
			transform: none;
			animation-timing-function: ease-in;
		}
		24%,
		100% {
			transform: translateY(260px);
		}
	}
</style>
