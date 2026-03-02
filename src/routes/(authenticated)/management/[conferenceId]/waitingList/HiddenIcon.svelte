<script lang="ts">
	interface Props {
		value: boolean;
	}

	let { value }: Props = $props();
</script>

{#if value}
	<span class="text-base-content/40">
		<i class="fa-duotone fa-eye-slash"></i>
	</span>
{:else}
	<span class="text-success">
		<i class="fa-duotone fa-eye"></i>
	</span>
{/if}
