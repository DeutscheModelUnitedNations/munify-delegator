<script lang="ts">
	interface Props {
		value: boolean | null;
	}

	let { value }: Props = $props();
</script>

{#if value === true}
	<i class="fa-solid fa-circle-check text-success"></i>
{:else if value === false}
	<i class="fa-solid fa-circle-xmark text-error"></i>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
