<script lang="ts">
	interface Props {
		title: string;
		description: string;
		btnText: string;
		action: () => Promise<void>;
	}

	let { title, description, btnText, action }: Props = $props();

	let loading = $state(false);

	const onClick = async () => {
		loading = true;
		action();
		loading = false;
	};
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xl font-bold">{title}</h3>
	<p>{@html description}</p>
	<button class="btn btn-primary max-w-md" onclick={onClick}>
		{#if loading}
			<i class="fa fa-spinner fa-spin"></i>
		{:else}
			<i class="fa fa-broom"></i>
		{/if}
		{btnText}
	</button>
</div>
