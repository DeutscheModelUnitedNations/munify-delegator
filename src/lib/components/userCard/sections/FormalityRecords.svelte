<!--
	@component
	What is on record of the person's formalities, across the whole width of the formalities tab, one tab
	at a time and always open: the scanned pages with the upload, the scans of them at the conference
	(with a confirmed place only) and in detail what they agreed to on paper.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import PostalScanList from '#lib/components/postal/PostalScanList.svelte';
	import UploadScanButton from '#lib/components/postal/UploadScanButton.svelte';
	import AgreementDetailList from '#lib/components/postal/AgreementDetailList.svelte';
	import AttendanceLog from '../AttendanceLog.svelte';
	import Empty from '../ui/Empty.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		conferenceParticipantId: string;
		/** A confirmed place at the conference, which the attendance goes with */
		access: boolean;
		/** Under 18 at the conference */
		guardianNeeded: boolean;
	}

	let { userId, conferenceId, conferenceParticipantId, access, guardianNeeded }: Props = $props();

	type RecordTab = 'scans' | 'attendance' | 'agreement';
	let chosen = $state<RecordTab>('scans');
	const shown = $derived(chosen === 'attendance' && !access ? 'scans' : chosen);

	const scanCount = $derived(
		(
			await client.liveQuery.postalScans({
				__args: { where: { conferenceParticipantId: { eq: conferenceParticipantId } } },
				fields: true
			})
		).length
	);
</script>

<Tabs>
	<Tab
		title={m.postalScansRow()}
		icon="scan"
		active={shown === 'scans'}
		onclick={() => (chosen = 'scans')}
	/>
	{#if access}
		<Tab
			title={m.attendanceLog()}
			icon="clipboard-text"
			active={shown === 'attendance'}
			onclick={() => (chosen = 'attendance')}
		/>
	{/if}
	<Tab
		title={m.agreementDetails()}
		icon="list-checks"
		active={shown === 'agreement'}
		onclick={() => (chosen = 'agreement')}
	/>
</Tabs>

<div role="tabpanel" class="min-w-0">
	{#if shown === 'scans'}
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			{#if scanCount > 0}
				<span class="text-base-content/60 text-sm">{m.postalScansCount({ count: scanCount })}</span>
			{:else}
				<Empty icon="scan" text={m.postalScansEmpty()} />
			{/if}
			<UploadScanButton {conferenceId} {userId} />
		</div>
		{#if scanCount > 0}
			<PostalScanList {conferenceParticipantId} />
		{/if}
	{:else if shown === 'attendance'}
		<AttendanceLog {userId} {conferenceId} />
	{:else}
		<AgreementDetailList {conferenceParticipantId} {guardianNeeded} />
	{/if}
</div>
