<script lang="ts">
	import { releaseNotice } from '$lib/assignment/board';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Whether participants see the assignment - and, right after applying while it is still hidden,
	 * the reminder to release it. The switch itself lives in the conference settings.
	 */
	interface Props {
		conferenceId: string;
		released: boolean;
		justApplied: boolean;
	}

	let { conferenceId, released, justApplied }: Props = $props();

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
	const notice = $derived(notices[releaseNotice(released, justApplied)]);
</script>

<section class="alert {notice.tone} alert-soft items-start">
	<i class="fa-sharp-duotone fa-solid {notice.icon} mt-1 text-xl"></i>
	<div class="flex flex-col gap-3">
		<h3 class="font-bold">{notice.title}</h3>
		<p class="text-sm">{notice.hint}</p>
		<a
			class="btn btn-sm w-fit"
			href={resolve(
				'/(authenticated)/dashboard/[conferenceId]/management/configuration?tab=status',
				{ conferenceId }
			)}
		>
			<i class="fa-sharp-duotone fa-solid fa-toggle-on"></i>
			{m.assignmentOpenReleaseSettings()}
		</a>
	</div>
</section>
