<script lang="ts">
	interface Props {
		description?: string;
	}

	let { description }: Props = $props();
</script>

{#if description}
	<span class="label-text mb-2 max-w-[50ch] text-xs">
		{description}
	</span>
{/if}
