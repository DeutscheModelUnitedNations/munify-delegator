<script lang="ts">
	import type { PaperstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { getPaperStatusIcon } from '$lib/utils/enumIcons';

	/** The status a review moves the paper to, one toggle button per allowed transition. */
	interface Props {
		transitions: { value: PaperstatusEnum; label: string }[];
		selected: PaperstatusEnum;
	}

	let { transitions, selected = $bindable() }: Props = $props();

	function buttonClass(value: PaperstatusEnum) {
		if (selected !== value) return 'btn-ghost';
		return value === 'CHANGES_REQUESTED' ? 'btn-warning' : 'btn-success';
	}
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
	<legend class="fieldset-legend">{m.newStatus()}</legend>
	<div class="flex w-full gap-2">
		{#each transitions as transition (transition.value)}
			<label class="flex-1 cursor-pointer">
				<input
					type="radio"
					name="status_tabs"
					class="hidden"
					checked={selected === transition.value}
					onchange={() => (selected = transition.value)}
				/>
				<div class="btn w-full {buttonClass(transition.value)}">
					<i class="fa-solid {getPaperStatusIcon(transition.value)}"></i>
					{transition.label}
				</div>
			</label>
		{/each}
	</div>
</fieldset>
