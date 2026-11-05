<script lang="ts">
	/** A toolbar button opening a panel, with the count of what is set there. */
	interface Props {
		label: string;
		icon: string;
		count?: number;
		onclick: () => void;
	}

	let { label, icon, count = 0, onclick }: Props = $props();
</script>

<button class="btn btn-ghost btn-sm no-print" {onclick}>
	<i class="fa-sharp-duotone fa-solid {icon}"></i>
	{label}
	{#if count > 0}
		<span class="badge badge-primary badge-xs">{count}</span>
	{/if}
</button>
