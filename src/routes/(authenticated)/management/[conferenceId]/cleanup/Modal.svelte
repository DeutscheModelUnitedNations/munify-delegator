<script lang="ts">
	import type { ModalData } from './types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		modalData: ModalData | undefined;
		open: boolean;
		closeModal: () => void;
	}

	let { modalData, open, closeModal }: Props = $props();
</script>

<div class="modal {open && 'modal-open'}">
	<button class="modal-backdrop" onclick={closeModal} aria-label="Close modal"></button>
	<div class="modal-box relative flex flex-col gap-4">
		<h1 class="text-2xl font-bold">{modalData?.message}</h1>
		<p>{m.deleted()}: <span class="badge badge-primary">{modalData?.count}</span></p>
		<div class="flex flex-row flex-wrap gap-1">
			{#each modalData?.detailArray ?? [] as id}
				<div class="badge badge-neutral badge-sm font-mono">{id}</div>
			{/each}
		</div>
		<button
			class="btn btn-ghost absolute top-4 right-4"
			onclick={closeModal}
			aria-label="Close modal"
		>
			<i class="fa fa-xmark"></i>
		</button>
	</div>
</div>
