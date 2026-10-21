<script lang="ts">
	import type { AdministrativestatusEnum } from '#lib/api/rumbleClient/client.js';
	import StatusWidget from './StatusWidget.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		title: string;
		faIcon: string;
		status: AdministrativestatusEnum;
		changeStatus: (status: AdministrativestatusEnum) => Promise<void>;
		doneHotkey?: string;
	}

	let { title, faIcon, status, changeStatus, doneHotkey }: Props = $props();

	const btnClick = async (status: AdministrativestatusEnum) => {
		await changeStatus(status);
	};
</script>

<StatusWidget
	{title}
	{faIcon}
	activeStatus={status ?? 'PENDING'}
	status={[
		{
			value: 'PENDING',
			title: m.statusPending(),
			faIcon: 'fa-hourglass-half',
			color: 'btn-warning'
		},
		{
			value: 'PROBLEM',
			title: m.statusProblem(),
			faIcon: 'fa-triangle-exclamation',
			color: 'btn-error'
		},
		{
			value: 'DONE',
			title: m.statusDone(),
			faIcon: 'fa-check',
			color: 'btn-success',
			hotkey: doneHotkey
		}
	]}
	changeStatus={btnClick}
/>
