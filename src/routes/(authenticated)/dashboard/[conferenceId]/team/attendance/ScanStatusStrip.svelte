<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { FoundPerson } from './scanLoad';

	interface Props {
		status: FoundPerson['status'];
	}

	let { status }: Props = $props();

	type AdministrativeStatus = FoundPerson['status']['paymentStatus'];

	const tone: Record<AdministrativeStatus, { badge: string; icon: string }> = {
		DONE: { badge: 'badge-success', icon: 'fa-check' },
		PENDING: { badge: 'badge-warning', icon: 'fa-hourglass-half' },
		PROBLEM: { badge: 'badge-error', icon: 'fa-triangle-exclamation' }
	};
</script>

{#snippet administrative(title: string, value: AdministrativeStatus)}
	<span class="badge badge-soft gap-1.5 {tone[value].badge}">
		<i class="fa-sharp-duotone fa-solid {tone[value].icon} text-xs"></i>
		{title}
	</span>
{/snippet}

<div class="flex flex-wrap items-center gap-2 text-sm">
	<span
		class="flex items-center gap-1.5 font-mono {status.accessCardId ? '' : 'text-base-content/60'}"
	>
		<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
		{status.accessCardId ?? m.noAccessCard()}
	</span>
	{@render administrative(m.payment(), status.paymentStatus)}
	{@render administrative(m.userAgreement(), status.termsAndConditions)}
	<span class="badge badge-soft gap-1.5 {status.didAttend ? 'badge-success' : 'badge-neutral'}">
		<i
			class="fa-sharp-duotone fa-solid {status.didAttend
				? 'fa-calendar-check'
				: 'fa-calendar'} text-xs"
		></i>
		{m.attendance()}
	</span>
</div>
