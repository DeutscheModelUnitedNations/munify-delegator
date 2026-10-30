<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import { ASSIGNMENT_RESULT_KINDS } from '#lib/helpers/emailKinds';
	import { emailKindTexts } from '#lib/helpers/emailKindTexts';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { succeeded } from '../toastError';

	/**
	 * Releases the assignment, or hides it again. Releasing asks whether the result mails go out
	 * now; they are switched on if they are not yet. Not sending skips the ones due right now.
	 */
	interface Props {
		conferenceId: string;
		released: boolean;
		onClose: () => void;
	}

	let { conferenceId, released, onClose }: Props = $props();

	const settings = $derived(
		await client.liveQuery.conferenceEmailSettings({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			kind: true,
			enabled: true
		})
	);
	const switchedOff = $derived(
		ASSIGNMENT_RESULT_KINDS.filter(
			(kind) => !settings.some((setting) => setting.kind === kind && setting.enabled)
		)
	);
	const anySwitchedOn = $derived(switchedOff.length < ASSIGNMENT_RESULT_KINDS.length);

	let sendEmails = $state(true);
	let saving = $state(false);

	async function confirm() {
		saving = true;
		const done = await succeeded(
			client.mutate.setAssignmentReleased({
				__args: released
					? { conferenceId, released: false }
					: { conferenceId, released: true, sendEmails }
			})
		);
		saving = false;
		if (!done) return;
		toast.success(released ? m.assignmentHidden() : m.assignmentReleasedToast());
		onClose();
	}
</script>

<ActionModal
	title={released ? m.assignmentHideTitle() : m.assignmentReleaseTitle()}
	confirmLabel={released ? m.assignmentHide() : m.assignmentRelease()}
	confirmClass={released ? 'btn-warning' : 'btn-primary'}
	loading={saving}
	onConfirm={confirm}
	{onClose}
>
	{#if released}
		<p>{m.assignmentHideText()}</p>
	{:else}
		<p>{m.assignmentReleaseText()}</p>
		<label class="flex cursor-pointer items-start gap-3">
			<input type="checkbox" class="toggle toggle-primary mt-0.5" bind:checked={sendEmails} />
			<span class="flex flex-col gap-1">
				<span class="font-medium">{m.assignmentReleaseSendEmails()}</span>
				<span class="text-sm opacity-70">
					{#if sendEmails}
						{m.assignmentReleaseSendEmailsHint()}
					{:else if anySwitchedOn}
						{m.assignmentReleaseSkipEmailsHint()}
					{:else}
						{m.assignmentReleaseNoEmailsHint()}
					{/if}
				</span>
			</span>
		</label>
		{#if sendEmails && switchedOff.length > 0}
			<div class="alert alert-info alert-soft text-sm">
				<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
				<div class="flex flex-col gap-1">
					<span>{m.assignmentReleaseSwitchesOn()}</span>
					<ul class="list-inside list-disc">
						{#each switchedOff as kind (kind)}
							<li>{emailKindTexts(kind).title}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	{/if}
</ActionModal>
