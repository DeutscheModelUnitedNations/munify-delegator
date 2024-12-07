<script lang="ts">
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import type { PageData } from '../$houdini';

	let {
		data
	}: {
		data: NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']> &
			Pick<PageData, 'user'>;
	} = $props();
</script>
