<script lang="ts">
	interface Props {
		value: boolean;
	}

	let { value }: Props = $props();
</script>

{#if value}
	<span class="text-base-content/40">
		<i class="ph-duotone ph-eye-slash"></i>
	</span>
{:else}
	<span class="text-success">
		<i class="ph-duotone ph-eye"></i>
	</span>
{/if}
