<script lang="ts">
	import type { AdministrativeStatus } from '@prisma/client';
	import hotkeys from 'hotkeys-js';
	import StatusWidget from './StatusWidget.svelte';

	interface Props {
		title: string;
		faIcon: string;
		status: AdministrativeStatus;
		changeStatus: (status: AdministrativeStatus) => Promise<void>;
		doneHotkey?: string;
	}

	let { title, faIcon, status, changeStatus, doneHotkey }: Props = $props();

	const btnClick = async (status: AdministrativeStatus) => {
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
			faIcon: 'fa-hourglass-half',
			color: 'btn-warning'
		},
		{
			value: 'PROBLEM',
			faIcon: 'fa-triangle-exclamation',
			color: 'btn-error'
		},
		{
			value: 'DONE',
			faIcon: 'fa-check',
			color: 'btn-success',
			hotkey: doneHotkey
		}
	]}
	changeStatus={btnClick}
/>
