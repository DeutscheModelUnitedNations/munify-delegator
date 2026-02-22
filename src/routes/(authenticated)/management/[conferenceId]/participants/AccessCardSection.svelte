<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		accessCardId: string | null | undefined;
		onSave: (value: string | null) => Promise<void>;
	}

	let { accessCardId, onSave }: Props = $props();

	let localValue = $state(accessCardId ?? '');

	$effect(() => {
		localValue = accessCardId ?? '';
	});

	const save = async () => {
		await onSave(localValue.trim() || null);
	};
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-id-card mr-2"></i>
		{m.accessCardId()}
	</h3>
	<div class="join">
		<input
			class="input join-item w-full"
			bind:value={localValue}
			type="text"
			placeholder={m.accessCardId()}
			onkeydown={(e) => {
				if (e.key === 'Enter') save();
			}}
		/>
		<button class="btn btn-square join-item" onclick={save} aria-label="Save">
			<i class="fa-solid fa-save"></i>
		</button>
	</div>
</div>
