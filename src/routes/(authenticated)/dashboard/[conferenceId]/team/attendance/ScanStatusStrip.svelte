<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { FoundPerson } from './scanLoad';

	interface Props {
		status: FoundPerson['status'];
	}

	let { status }: Props = $props();

	type AdministrativeStatus = FoundPerson['status']['paymentStatus'];

	const tone: Record<AdministrativeStatus, { badge: string; icon: string }> = {
		DONE: { badge: 'badge-success', icon: 'ph-check' },
		PENDING: { badge: 'badge-warning', icon: 'ph-hourglass-medium' },
		PROBLEM: { badge: 'badge-error', icon: 'ph-warning' }
	};
</script>

{#snippet administrative(title: string, value: AdministrativeStatus)}
	<span class="badge badge-soft gap-1.5 {tone[value].badge}">
		<i aria-hidden="true" class="ph-duotone {tone[value].icon} text-xs"></i>
		{title}
	</span>
{/snippet}

<div class="flex flex-wrap items-center gap-2 text-sm">
	{@render administrative(m.payment(), status.paymentStatus)}
	{@render administrative(m.userAgreement(), status.termsAndConditions)}
	<span class="badge badge-soft gap-1.5 {status.didAttend ? 'badge-success' : 'badge-neutral'}">
		<i
			aria-hidden="true"
			class="ph-duotone {status.didAttend ? 'ph-calendar-check' : 'ph-calendar-blank'} text-xs"
		></i>
		{m.attendance()}
	</span>
</div>
