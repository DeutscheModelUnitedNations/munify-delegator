<script lang="ts">
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { m } from '#lib/paraglide/messages';
</script>

<DashboardSection
	icon="hourglass-medium"
	title={m.selectionInProgressTitle()}
	description={m.selectionInProgressDescription()}
	variant="info"
>
	<div class="flex flex-col gap-2 text-sm">
		<p>{m.selectionInProgressDuration()}</p>
		<div class="alert alert-warning alert-soft">
			<i aria-hidden="true" class="ph-duotone ph-warning text-xl"></i>
			<span>{m.selectionInProgressNoGuarantee()}</span>
		</div>
		<p class="font-semibold">{m.selectionInProgressNoInquiries()}</p>
	</div>
</DashboardSection>
