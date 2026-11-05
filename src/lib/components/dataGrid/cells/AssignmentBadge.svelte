<script lang="ts">
	interface Props {
		tooltip: string;
		/** ISO 3166-1 alpha-2 code, shown as a flag */
		flagCode?: string;
		/** FontAwesome icon, shown when there is no flag */
		icon?: string | null;
	}

	let { tooltip, flagCode, icon }: Props = $props();
</script>

<div
	class="bg-base-300 tooltip mx-auto flex h-[1.5rem] w-[2rem] items-center justify-center overflow-hidden rounded-field shadow"
	data-tip={tooltip}
>
	{#if flagCode}
		<span class="fi fi-{flagCode} !w-full !leading-[100rem]"></span>
	{:else if icon}
		<span class="fas fa-{icon.replace('fa-', '')}"></span>
	{/if}
</div>
