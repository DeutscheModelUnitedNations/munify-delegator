<script lang="ts">
	import { releaseNotice } from '../boardState';
	import { m } from '#lib/paraglide/messages';
	import ReleaseDialog from './ReleaseDialog.svelte';

	/**
	 * Whether participants see the assignment - and, right after applying while it is still hidden,
	 * the reminder to release it - with the switch to release or hide it.
	 */
	interface Props {
		conferenceId: string;
		released: boolean;
		justApplied: boolean;
		onReleased: () => void;
	}

	let { conferenceId, released, justApplied, onReleased }: Props = $props();

	let confirming = $state(false);

	const notices = {
		released: {
			tone: 'alert-success',
			icon: 'fa-eye',
			title: m.assignmentReleasedTitle(),
			hint: m.assignmentReleasedHint()
		},
		reminder: {
			tone: 'alert-warning',
			icon: 'fa-eye-slash',
			title: m.assignmentNotReleasedTitle(),
			hint: m.assignmentReleaseReminder()
		},
		hidden: {
			tone: 'alert-info',
			icon: 'fa-eye-slash',
			title: m.assignmentNotReleasedTitle(),
			hint: m.assignmentNotReleasedHint()
		}
	};
	const notice = $derived(notices[releaseNotice({ released, justApplied })]);
</script>

<section class="alert {notice.tone} alert-soft items-start">
	<i class="fa-sharp-duotone fa-solid {notice.icon} mt-1 text-xl"></i>
	<div class="flex flex-col gap-3">
		<h3 class="font-bold">{notice.title}</h3>
		<p class="text-sm">{notice.hint}</p>
		<button
			class="btn btn-sm w-fit {released ? '' : 'btn-primary'}"
			onclick={() => (confirming = true)}
		>
			<i class="fa-sharp-duotone fa-solid {released ? 'fa-eye-slash' : 'fa-eye'}"></i>
			{released ? m.assignmentHide() : m.assignmentRelease()}
		</button>
	</div>
</section>

{#if confirming}
	<ReleaseDialog {conferenceId} {released} {onReleased} onClose={() => (confirming = false)} />
{/if}
