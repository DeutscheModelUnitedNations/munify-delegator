<script lang="ts">
	interface Props {
		cssClass?: string;
		onClick: () => void | Promise<void>;
		icon: string;
		/** What the button does: it shows only an icon */
		label: string;
		disabled?: boolean;
		duotone?: boolean;
	}

	let { cssClass, onClick, icon, label, disabled, duotone = true }: Props = $props();

	let loading = $state(false);

	const fullOnClick = async () => {
		loading = true;
		await onClick();
		loading = false;
	};
</script>

<button
	class="btn btn-square btn-sm {cssClass}"
	onclick={fullOnClick}
	{disabled}
	aria-label={label}
	aria-busy={loading}
>
	{#if loading}
		<i aria-hidden="true" class="{duotone ? 'ph-duotone' : 'ph-fill'} ph-spinner-gap animate-spin"
		></i>
	{:else}
		<i aria-hidden="true" class="{duotone ? 'ph-duotone' : 'ph-fill'} ph-{icon.replace(/^ph-/, '')}"
		></i>
	{/if}
</button>
