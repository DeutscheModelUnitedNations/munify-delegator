<script lang="ts">
	import { getRegistrationStatus, registrationStatusLight } from '#lib/utils/registrationStatus';
	import { getWaitingListStatus } from '#lib/helpers/waitingListStatus';
	import StatusLight from './StatusLight.svelte';

	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		registrationStatus: ReturnType<typeof getRegistrationStatus>;
		waitingListStatus: ReturnType<typeof getWaitingListStatus>;
	}

	let { registrationStatus, waitingListStatus, size }: Props = $props();
</script>

<StatusLight {size} {...registrationStatusLight({ registrationStatus, waitingListStatus })} />
