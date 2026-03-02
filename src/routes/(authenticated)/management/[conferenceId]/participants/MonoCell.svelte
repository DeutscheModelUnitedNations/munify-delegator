<script lang="ts">
	interface Props {
		value: string;
	}

	let { value }: Props = $props();
</script>

<span class="font-mono text-xs">{value}</span>
