<script lang="ts">
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<DashboardSection
	icon="hourglass-half"
	title={m.selectionInProgressTitle()}
	description={m.selectionInProgressDescription()}
	variant="info"
>
	<div class="flex flex-col gap-2 text-sm">
		<p>{m.selectionInProgressDuration()}</p>
		<p class="font-semibold">{m.selectionInProgressNoInquiries()}</p>
	</div>
</DashboardSection>
