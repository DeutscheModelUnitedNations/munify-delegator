<script lang="ts">
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import hotkeys from 'hotkeys-js';
	import StatusWidget from './StatusWidget.svelte';

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
