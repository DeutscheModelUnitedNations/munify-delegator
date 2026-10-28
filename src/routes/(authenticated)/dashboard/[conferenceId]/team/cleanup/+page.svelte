<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Modal from './Modal.svelte';
	import NormalizeSchools from './NormalizeSchools.svelte';
	import type { ModalData } from './types';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let modalData = $state<ModalData>();
</script>

<div class="flex w-full min-w-0 flex-col gap-8 py-4 sm:gap-10 sm:p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.cleanupDescription()}</p>
	</div>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.cleanupNormalizeSchoolsTitle()}</h3>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.cleanupNormalizeSchoolsDescription()}</p>
		<NormalizeSchools conferenceId={params.conferenceId} />
	</div>
</div>

<Modal {modalData} open={!!modalData} closeModal={() => (modalData = undefined)} />
