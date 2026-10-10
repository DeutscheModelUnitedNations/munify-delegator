<script lang="ts">
	interface Props {
		value: boolean;
	}

	let { value }: Props = $props();
</script>

{#if value}
	<span class="text-base-content/40">
		<i class="fa-sharp-duotone fa-solid fa-eye-slash"></i>
	</span>
{:else}
	<span class="text-success">
		<i class="fa-sharp-duotone fa-solid fa-eye"></i>
	</span>
{/if}
