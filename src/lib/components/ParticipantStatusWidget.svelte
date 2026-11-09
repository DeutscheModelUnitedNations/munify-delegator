<script lang="ts">
	import type { AdministrativestatusEnum } from '#lib/api/rumbleClient/client';
	import StatusWidget from './StatusWidget.svelte';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		title: string;
		icon: string;
		status: AdministrativestatusEnum;
		changeStatus: (status: AdministrativestatusEnum) => Promise<void>;
		doneHotkey?: string;
	}

	let { title, icon, status, changeStatus, doneHotkey }: Props = $props();

	const btnClick = async (status: AdministrativestatusEnum) => {
		await changeStatus(status);
	};
</script>

<StatusWidget
	{title}
	{icon}
	activeStatus={status ?? 'PENDING'}
	status={[
		{
			value: 'PENDING',
			title: m.statusPending(),
			icon: 'ph-hourglass-medium',
			color: 'btn-warning'
		},
		{
			value: 'PROBLEM',
			title: m.statusProblem(),
			icon: 'ph-warning',
			color: 'btn-error'
		},
		{
			value: 'DONE',
			title: m.statusDone(),
			icon: 'ph-check',
			color: 'btn-success',
			hotkey: doneHotkey
		}
	]}
	changeStatus={btnClick}
/>
