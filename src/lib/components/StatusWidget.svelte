<script lang="ts">
	import type { AdministrativeStatus } from '@prisma/client';

	interface Props {
		title: string;
		faIcon: string;
		status: AdministrativeStatus;
		changeStatus: (status: AdministrativeStatus) => Promise<void>;
	}

	let { title, faIcon, status, changeStatus }: Props = $props();

	let loading = $state(false);

	const btnClick = async (status: AdministrativeStatus) => {
		loading = true;
		await changeStatus(status);
		loading = false;
	};
</script>

<div class="card flex flex-col gap-2 bg-base-100 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')} mr-2"></i>
		{title}
	</h3>
	<div class="join w-full">
		<button
			class="btn {status === 'PENDING' && 'btn-warning'} join-item flex-1"
			aria-label="Pending"
			onclick={() => btnClick('PENDING')}
		>
			{#if loading}
				<i class="fas fa-spin fa-spinner"></i>
			{:else}
				<i class="fas fa-hourglass-half text-lg"></i>
			{/if}
		</button>
		<button
			class="btn {status === 'PROBLEM' && 'btn-error'} join-item flex-1"
			aria-label="Problem"
			onclick={() => btnClick('PROBLEM')}
		>
			{#if loading}
				<i class="fas fa-spin fa-spinner"></i>
			{:else}
				<i class="fas fa-triangle-exclamation text-lg"></i>
			{/if}
		</button>
		<button
			class="btn {status === 'DONE' && 'btn-success'} join-item flex-1"
			aria-label="Done"
			onclick={() => btnClick('DONE')}
		>
			{#if loading}
				<i class="fas fa-spin fa-spinner"></i>
			{:else}
				<i class="fas fa-check text-lg"></i>
			{/if}
		</button>
	</div>
</div>
