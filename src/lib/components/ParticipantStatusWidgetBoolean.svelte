<script lang="ts">
	import StatusWidget from './StatusWidget.svelte';

	interface Props {
		title: string;
		faIcon: string;
		status: boolean;
		changeStatus: (status: boolean) => Promise<void>;
	}

	let { title, faIcon, status, changeStatus }: Props = $props();

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
			faIcon: 'fa-xmark',
			color: 'error'
		},
		{
			value: true,
			faIcon: 'fa-check',
			color: 'success'
		}
	]}
	changeStatus={btnClick}
/>
