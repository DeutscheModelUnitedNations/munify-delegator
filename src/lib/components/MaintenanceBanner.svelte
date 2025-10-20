<script lang="ts">
	import { configPublic } from '$config/public';
	import { m } from '$lib/paraglide/messages';

	const { PUBLIC_MAINTENANCE_WINDOW_START, PUBLIC_MAINTENANCE_WINDOW_END } = configPublic;

	let start: Date | undefined = PUBLIC_MAINTENANCE_WINDOW_START
		? new Date(PUBLIC_MAINTENANCE_WINDOW_START)
		: undefined;
	let end: Date | undefined = PUBLIC_MAINTENANCE_WINDOW_END
		? new Date(PUBLIC_MAINTENANCE_WINDOW_END)
		: undefined;

	let now = $state(new Date());
	let visible = $state(false);
	let isUpcoming = $state(false);

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60000); // Update every minute
		if (start && end && end > now) {
			visible = true;
			if (start > now) {
				isUpcoming = true;
			} else {
				isUpcoming = false;
			}
		} else {
			visible = false;
		}
		return () => clearInterval(interval);
	});
</script>

{#if visible}
	<div class="bg-base-100 p-4 pb-0">
		<div
			class="alert shadow-lg {isUpcoming
				? 'alert-info'
				: 'alert-warning'} alert-vertical sm:alert-horizontal"
		>
			<i class="fa-solid fa-person-digging text-2xl"></i>
			<div class="flex flex-1 flex-col gap-2 sm:gap-1">
				<h3 class="font-bold">{m.maintenanceMessage()}</h3>
				<div class="text-xs">
					{isUpcoming ? m.maintenanceDescriptionUpcoming() : m.maintenanceDescriptionOngoing()}
				</div>
				{#if isUpcoming}
					<div>
						<div class="text-xs">
							{m.start()}:
							{start?.toLocaleString(undefined, {
								dateStyle: 'full',
								timeStyle: 'short'
							})}
							{m.inYourTimeZone()}
						</div>
						<div class="text-xs">
							{m.end()}:
							{end?.toLocaleString(undefined, {
								dateStyle: 'full',
								timeStyle: 'short'
							})}
							{m.inYourTimeZone()}
						</div>
					</div>
				{:else}
					<div class="text-xs">
						{m.nowUntil()}
						{end?.toLocaleString(undefined, {
							dateStyle: 'full',
							timeStyle: 'short'
						})}
						{m.inYourTimeZone()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
