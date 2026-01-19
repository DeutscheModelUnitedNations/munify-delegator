<script lang="ts">
	import StatusWidget from './StatusWidget.svelte';

	interface Props {
		title: string;
		faIcon: string;
		status: boolean;
		trueicon?: string;
		falseicon?: string;
		truecolor?: 'btn-success' | 'btn-warning' | 'btn-error' | 'btn-info';
		falsecolor?: 'btn-success' | 'btn-warning' | 'btn-error' | 'btn-info';
		changeStatus: (status: boolean) => Promise<void>;
	}

	let { title, faIcon, status, trueicon, falseicon, truecolor, falsecolor, changeStatus }: Props =
		$props();

	const btnClick = async (status: boolean) => {
		await changeStatus(status);
	};
</script>

<StatusWidget
	{title}
	{faIcon}
	activeStatus={status}
	status={[
		{
			value: false,
			faIcon: falseicon || 'fa-xmark',
			color: falsecolor || 'btn-error'
		},
		{
			value: true,
			faIcon: trueicon || 'fa-check',
			color: truecolor || 'btn-success'
		}
	]}
	changeStatus={btnClick}
/>
