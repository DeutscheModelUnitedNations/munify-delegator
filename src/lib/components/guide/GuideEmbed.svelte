<script lang="ts">
	import { youtubeIdOf } from '#lib/guide/document';
	import { m } from '#lib/paraglide/messages';

	/**
	 * A video of a guide page. Nothing loads from YouTube until the reader asks for it: before,
	 * the page sends no request there.
	 */
	let { url }: { url: string } = $props();

	const videoId = $derived(youtubeIdOf(url));
	let loaded = $state(false);
</script>

{#if videoId}
	<div class="not-prose my-4">
		{#if loaded}
			<iframe
				class="rounded-box aspect-video w-full"
				src="https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1"
				title={m.guideVideo()}
				allow="autoplay; encrypted-media; picture-in-picture"
				allowfullscreen
			></iframe>
		{:else}
			<button
				type="button"
				class="rounded-box bg-base-300 hover:bg-base-200 flex aspect-video w-full flex-col items-center justify-center gap-2 p-4 text-center"
				onclick={() => (loaded = true)}
			>
				<i class="ph-duotone ph-youtube-logo text-5xl" aria-hidden="true"></i>
				<span class="font-semibold">{m.guideVideoLoad()}</span>
				<span class="text-sm opacity-70">{m.guideVideoPrivacy()}</span>
			</button>
		{/if}
	</div>
{:else if url}
	<p>
		<a href={url} class="link link-primary" target="_blank" rel="noopener noreferrer">{url}</a>
	</p>
{/if}
