<script lang="ts">
	interface Props {
		label?: string;
	}

	let { label }: Props = $props();
</script>

{#if label}
	<span class="label mb-2 whitespace-break-spaces">{label}</span>
{/if}
