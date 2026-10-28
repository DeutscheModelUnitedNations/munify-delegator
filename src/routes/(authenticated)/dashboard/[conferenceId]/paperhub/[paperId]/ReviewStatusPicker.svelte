<script lang="ts">
	import type { PaperstatusEnum } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getPaperStatusIcon } from '#lib/utils/enumIcons.js';

	/** The status a review moves the paper to, one toggle button per allowed transition. */
	interface Props {
		transitions: { value: PaperstatusEnum; label: string }[];
		selected: PaperstatusEnum;
	}

	let { transitions, selected = $bindable() }: Props = $props();

	function buttonClass(value: PaperstatusEnum) {
		if (selected !== value) return 'btn-outline';
		return value === 'CHANGES_REQUESTED' ? 'btn-warning' : 'btn-success';
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-semibold">{m.newStatus()}</span>
	<div class="flex w-full gap-2 max-sm:flex-col">
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
					<i class="fa-sharp-duotone fa-solid {getPaperStatusIcon(transition.value)}"></i>
					{transition.label}
				</div>
			</label>
		{/each}
	</div>
</div>
