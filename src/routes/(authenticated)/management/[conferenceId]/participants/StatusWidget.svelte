<script lang="ts">
	import type { AdministrativeStatus } from '@prisma/client';

	interface Props {
		title: string;
		faIcon: string;
		status: AdministrativeStatus;
	}

	let { title, faIcon, status }: Props = $props();
</script>

<div class="card flex flex-col gap-2 shadow-md p-4">
	<h3 class="font-bold">
		<i class="fa-duotone fa-{faIcon.replace('fa-', '')} mr-2"></i>
		{title}
	</h3>
	<div class="join w-full">
		<button
			class="btn {status === 'PENDING' && 'btn-warning'} join-item flex-1"
			aria-label="Pending"
		>
			<i class="fas fa-hourglass-half text-lg"></i>
		</button>
		<button
			class="btn {status === 'PROBLEM' && 'btn-error'} join-item flex-1"
			aria-label="Problem"
		>
			<i class="fas fa-triangle-exclamation text-lg"></i>
		</button>
		<button
			class="btn {status === 'DONE' && 'btn-success'} join-item flex-1"
			aria-label="Done"
		>
			<i class="fas fa-check text-lg"></i>
		</button>
	</div>
</div>
