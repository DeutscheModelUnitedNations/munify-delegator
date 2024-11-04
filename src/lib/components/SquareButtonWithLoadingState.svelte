<script lang="ts">
	interface Props {
		cssClass?: string;
		onClick: () => void | Promise<void>;
		icon: string;
		disabled?: boolean;
		duotone?: boolean;
	}

	let { cssClass, onClick, icon, disabled, duotone = true }: Props = $props();

	let loading = $state(false);

	const fullOnClick = async () => {
		loading = true;
		await onClick();
		loading = false;
	};
</script>

<button class="btn btn-square btn-sm {cssClass}" onclick={fullOnClick} {disabled}>
	{#if loading}
		<i class="fa-{duotone ? 'duotone' : 'solid'} fa-spinner fa-spin"></i>
	{:else}
		<i class="fa-{duotone ? 'duotone' : 'solid'} fa-{icon.replace('fa-', '')}"></i>
	{/if}
</button>
