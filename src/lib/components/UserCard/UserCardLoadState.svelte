<script lang="ts">
	import UserCardLoadError from './UserCardLoadError.svelte';

	interface Props {
		/** Shows the error with a retry button instead of the loading skeleton */
		failed: boolean;
		onretry: () => void;
		/** Height classes of the skeleton blocks shown while loading */
		skeletons?: string[];
	}

	let { failed, onretry, skeletons = ['h-24', 'h-24'] }: Props = $props();
</script>

{#if failed}
	<UserCardLoadError {onretry} />
{:else}
	<div class="flex flex-col gap-3">
		{#each skeletons as height, index (index)}
			<div class="skeleton {height} w-full"></div>
		{/each}
	</div>
{/if}
