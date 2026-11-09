<script lang="ts">
	interface Props {
		/** How many seats the nation holds in the committee; 0 when it is not part of it */
		seats: number;
	}

	let { seats }: Props = $props();
</script>

{#if seats > 0}
	<div class="text-success">
		{#each { length: seats }}
			<i aria-hidden="true" class="ph-fill ph-check"></i>
		{/each}
	</div>
{:else}
	<i aria-hidden="true" class="ph-fill ph-minus text-base-content/20"></i>
{/if}
