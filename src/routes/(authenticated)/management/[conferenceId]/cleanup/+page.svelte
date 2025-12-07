<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import Modal from './Modal.svelte';
	import NormalizeSchools from './NormalizeSchools.svelte';
	import Section from './Section.svelte';
	import type { ModalData } from './types';

	let { data } = $props();

	let modalData = $state<ModalData>();

	function createModalData(
		message: string,
		result: { user?: { given_name: string; family_name: string }; id?: string }[] | undefined
	) {
		if (!result) return { message: 'Error - No result', count: 0, detailArray: [] };
		return {
			message,
			count: result.length,
			detailArray:
				result
					.map((item) =>
						item.user ? formatNames(item.user.given_name, item.user.family_name) : item.id
					)
					.filter((item) => item !== undefined) ?? []
		};
	}
</script>

<div class="flex w-full flex-col flex-wrap gap-10 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.cleanup()}</h2>
		<p>{@html m.cleanupDescription()}</p>
	</div>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.cleanupNormalizeSchoolsTitle()}</h3>
		<p>{@html m.cleanupNormalizeSchoolsDescription()}</p>
		<NormalizeSchools conferenceId={data.conferenceId} />
	</div>
</div>

<Modal {modalData} open={!!modalData} closeModal={() => (modalData = undefined)} />
