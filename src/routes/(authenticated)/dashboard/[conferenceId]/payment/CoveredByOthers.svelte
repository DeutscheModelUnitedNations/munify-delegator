<script lang="ts">
	import formatNames from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { fetchPaymentsCoveringMe } from './myPayments';

	/**
	 * Somebody else made a reference that covers the caller: who, and whether they said they
	 * transferred. So nobody pays twice. Rendered in a boundary that shows nothing on failure.
	 */
	let { conferenceId, userId }: { conferenceId: string; userId: string } = $props();

	const payments = $derived(await fetchPaymentsCoveringMe({ conferenceId, userId }));
	const onDay = (date: Date) => new Date(date).toLocaleDateString(getLocale());
</script>

{#each payments as payment (payment.id)}
	{@const name = formatNames({
		givenName: payment.user.givenName ?? undefined,
		familyName: payment.user.familyName ?? undefined
	})}
	<div role="status" class="alert alert-info">
		<i aria-hidden="true" class="ph-duotone ph-users-three text-2xl"></i>
		<span>
			{payment.transferReportedAt
				? m.paymentCoveredTransferred({ name, date: onDay(payment.transferReportedAt) })
				: m.paymentCoveredReference({ name })}
		</span>
	</div>
{/each}
