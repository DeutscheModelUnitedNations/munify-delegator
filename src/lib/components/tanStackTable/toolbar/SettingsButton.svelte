<script lang="ts">
	import TableSizeControl from './SizeControl.svelte';
	import ZebraControl from './ZebraControl.svelte';
	import { m } from '$lib/paraglide/messages';

	let confirmDialogOpen = $state(false);
</script>

<button
	class="btn btn-square btn-ghost"
	onclick={() => (confirmDialogOpen = true)}
	aria-label="Settings"
>
	<i class="fa-duotone fa-gears text-xl"></i>
</button>

<dialog class="modal {confirmDialogOpen && 'modal-open'}">
	<div class="modal-box relative">
		<h3 class="text-xl font-bold">{m.settings()}</h3>
		<div class="flex flex-col gap-6 py-5">
			<TableSizeControl />
			<ZebraControl />
		</div>
		<div class="absolute top-2 right-2">
			<button
				class="btn btn-square btn-ghost"
				onclick={() => (confirmDialogOpen = false)}
				aria-label="Close"
			>
				<i class="fa-duotone fa-xmark"></i>
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop" onsubmit={() => (confirmDialogOpen = false)}>
		<button>{m.close()}</button>
	</form>
</dialog>
