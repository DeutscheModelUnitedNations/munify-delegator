<script lang="ts">
	interface Props {
		startHour: number;
		endHour: number;
		hourHeight: number;
		timezone?: string;
	}

	let { startHour, endHour, hourHeight, timezone = 'UTC' }: Props = $props();

	let now = $state(new Date());

	function getCurrentHour(date: Date): number {
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hour: 'numeric',
			minute: 'numeric',
			hour12: false,
			hourCycle: 'h23'
		});
		const parts = fmt.formatToParts(date);
		const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
		const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
		return hour + minute / 60;
	}

	let visible = $derived.by(() => {
		const currentHour = getCurrentHour(now);
		return currentHour >= startHour && currentHour <= endHour;
	});
	let topPosition = $derived.by(() => {
		const currentHour = getCurrentHour(now);
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
			<div class="bg-error h-3 w-3 shrink-0 rounded-full -translate-x-0.5"></div>
			<div class="bg-error h-0.5 flex-1"></div>
		</div>
	</div>
{/if}
