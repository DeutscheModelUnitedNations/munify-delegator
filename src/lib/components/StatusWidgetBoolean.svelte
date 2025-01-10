<script lang="ts">
	interface Props {
		title: string;
		faIcon: string;
		status: boolean;
		changeStatus: (status: boolean) => Promise<void>;
	}

	let { title, faIcon, status, changeStatus }: Props = $props();

	let loading = $state(false);

	const btnClick = async (status: boolean) => {
		loading = true;
		await changeStatus(status);
		loading = false;
	};
</script>

<div class="card flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')} mr-2"></i>
		{title}
	</h3>
	<div class="join w-full">
		<button
			class="btn {!status && 'btn-error'} join-item flex-1"
			aria-label="False"
			onclick={() => btnClick(false)}
		>
			{#if loading}
				<i class="fas fa-spin fa-spinner"></i>
			{:else}
				<i class="fas fa-xmark text-lg"></i>
			{/if}
		</button>
		<button
			class="btn {status && 'btn-success'} join-item flex-1"
			aria-label="True"
			onclick={() => btnClick(true)}
		>
			{#if loading}
				<i class="fas fa-spin fa-spinner"></i>
			{:else}
				<i class="fas fa-check text-lg"></i>
			{/if}
		</button>
	</div>
</div>
