<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canManageParticipants } from '#lib/helpers/teamAccess';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import formatNames from '#lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';

	/**
	 * For a delegate too old for a delegation but old enough to supervise (`shouldBeSupervisor`):
	 * participant care turns them into the supervisor of the delegation they leave.
	 */
	interface Props {
		conferenceId: string;
		member: { id: string; user: { id: string; givenName: string; familyName: string } };
	}

	let { conferenceId, member }: Props = $props();

	const userId = $derived(member.user.id);
	const notice = $derived(
		canManageParticipants(await fetchTeamAccess(conferenceId))
			? await client.query.ageNotice({
					__args: { conferenceId, userId, role: 'participant' },
					issue: true,
					age: true
				})
			: null
	);
	const name = $derived(
		formatNames({
			givenName: member.user.givenName,
			familyName: member.user.familyName,
			options: { givenNameUppercase: false, familyNameUppercase: false }
		})
	);

	async function makeSupervisor() {
		if (
			!(await confirmDialog({
				text: m.confirmMakeSupervisor({ name }),
				confirmLabel: m.makeSupervisor()
			}))
		)
			return;
		const promise = client.mutate.makeDelegationMemberSupervisor({
			__args: { delegationMemberId: member.id },
			id: true
		});
		toast.promise(promise, { ...genericPromiseToastMessages, success: m.madeSupervisor({ name }) });
		await promise;
	}
</script>

{#if notice?.issue === 'shouldBeSupervisor'}
	<div role="alert" class="alert alert-warning alert-soft flex flex-wrap">
		<i aria-hidden="true" class="ph-duotone ph-chalkboard-teacher text-xl"></i>
		<span class="flex-1">{m.makeSupervisorNotice({ name, age: notice.age })}</span>
		<button class="btn btn-sm" onclick={makeSupervisor}>
			<i aria-hidden="true" class="ph-duotone ph-user-switch"></i>
			{m.makeSupervisor()}
		</button>
	</div>
{/if}
