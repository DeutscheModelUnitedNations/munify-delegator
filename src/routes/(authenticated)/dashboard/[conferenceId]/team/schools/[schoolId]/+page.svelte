<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { hasErrorCode } from '#lib/api/errorCodes';
	import { m } from '#lib/paraglide/messages';
	import SchoolForm from './SchoolForm.svelte';
	import SchoolMetrics from './SchoolMetrics.svelte';
	import SchoolPeople from './SchoolPeople.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const schoolId = $derived(params.schoolId);

	const school = $derived(
		await client.liveQuery.school({ __args: { id: schoolId }, name: true, city: true })
	);

	let confirmingDelete = $state(false);

	async function deleteSchool() {
		const promise = Promise.resolve(client.mutate.deleteSchool({ __args: { id: schoolId } }));
		toast.promise(promise, {
			...genericPromiseToastMessages,
			success: m.schoolDeleted(),
			// named by people of other conferences
			error: (err: unknown) =>
				hasErrorCode({ err, code: 'NOT_FOUND' })
					? m.schoolDeleteNotAllowed()
					: m.genericToastError()
		});
		await promise;
		confirmingDelete = false;
		await goto(resolve(`dashboard/${conferenceId}/team/schools`));
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<a href={resolve(`dashboard/${conferenceId}/team/schools`)} class="link link-hover text-sm">
			<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
			{m.schools()}
		</a>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-2xl font-bold">
				<i aria-hidden="true" class="ph-duotone ph-graduation-cap"></i>
				{school.name}
			</h2>
			<button class="btn btn-error btn-outline btn-sm" onclick={() => (confirmingDelete = true)}>
				<i aria-hidden="true" class="ph-duotone ph-trash"></i>
				{m.schoolDelete()}
			</button>
		</div>
		{#if school.city}
			<p class="text-base-content/70">{school.city}</p>
		{/if}
	</div>

	<SchoolMetrics {schoolId} {conferenceId} />

	<section class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			{#key schoolId}
				<SchoolForm {schoolId} />
			{/key}
		</div>
	</section>

	<SchoolPeople {schoolId} {conferenceId} />
</div>

{#if confirmingDelete}
	<ConfirmDeleteModal
		title={m.schoolDelete()}
		text={m.schoolDeleteConfirm({ name: school.name })}
		onConfirm={deleteSchool}
		onClose={() => (confirmingDelete = false)}
	/>
{/if}
