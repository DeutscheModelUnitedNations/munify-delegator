<script lang="ts">
	interface Props {
		startHour: number;
		endHour: number;
		hourHeight: number;
	}

	let { startHour, endHour, hourHeight }: Props = $props();

	let now = $state(new Date());
	let visible = $derived.by(() => {
		const currentHour = now.getHours() + now.getMinutes() / 60;
		return currentHour >= startHour && currentHour <= endHour;
	});
	let topPosition = $derived.by(() => {
		const currentHour = now.getHours() + now.getMinutes() / 60;
		return (currentHour - startHour) * hourHeight;
	});

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60_000);
		return () => clearInterval(interval);
	});
</script>

{#if visible}
	<div class="pointer-events-none absolute left-0 right-0 z-20" style="top: {topPosition}px">
		<div class="flex items-center">
			<div class="bg-error h-3 w-3 shrink-0 rounded-full"></div>
			<div class="bg-error h-0.5 flex-1"></div>
		</div>
	</div>
{/if}
