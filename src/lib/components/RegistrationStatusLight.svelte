<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getRegistrationStatus } from '$lib/services/registrationStatus';
	import { getWaitingListStatus } from '$lib/services/waitingListStatus';
	import StatusLight from './StatusLight.svelte';

	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		registrationStatus: ReturnType<typeof getRegistrationStatus>;
		waitingListStatus: ReturnType<typeof getWaitingListStatus>;
	}

	let { registrationStatus, waitingListStatus, size }: Props = $props();

	const getStatusLighConfig = (): {
		color: 'success' | 'warning' | 'error' | 'info';
		blink: boolean;
		tooltip?: string;
	} => {
		if (registrationStatus === 'OPEN') {
			return { color: 'success', blink: true };
		} else if (registrationStatus === 'WAITING_LIST') {
			if (waitingListStatus === 'VACANCIES') {
				return { color: 'warning', blink: true, tooltip: m.vacancies() };
			} else if (waitingListStatus === 'LONG_LIST') {
				return { color: 'warning', blink: false, tooltip: m.longWaitingList() };
			}
			return { color: 'warning', blink: false, tooltip: m.shortWaitingList() };
		}
		return { color: 'error', blink: false, tooltip: m.registrationClosed() };
	};
</script>

<StatusLight {size} {...getStatusLighConfig()} />
