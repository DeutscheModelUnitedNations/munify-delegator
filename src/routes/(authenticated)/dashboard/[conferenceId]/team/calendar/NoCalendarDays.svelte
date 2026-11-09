<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Shown while the conference has no calendar days, with a way to add the first. */
	let { onAdd }: { onAdd: () => void } = $props();
</script>

<div
	class="bg-base-200 flex flex-col items-center justify-center rounded-box p-6 text-center sm:p-12"
>
	<i aria-hidden="true" class="ph-fill ph-calendar-dots text-5xl opacity-50"></i>
	<p class="mt-4 text-lg opacity-70">{m.calendarNoDays()}</p>
	<button class="btn btn-primary mt-4" onclick={onAdd}>
		<i aria-hidden="true" class="ph-fill ph-plus"></i>
		{m.calendarAddDay()}
	</button>
</div>
