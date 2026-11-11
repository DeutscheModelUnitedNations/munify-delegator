<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import formatNames from '#lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import PersonName from '../PersonName.svelte';
	import OpenUserCardButton from '../OpenUserCardButton.svelte';

	interface Member {
		id: string;
		isHeadDelegate: boolean;
		user: { id: string; givenName: string; familyName: string };
		assignedCommittee?: { abbreviation: string } | null;
	}

	/** A delegation's members, the card's person (`userId`) highlighted, each removable. */
	interface Props {
		members: Member[];
		userId: string;
	}

	let { members, userId }: Props = $props();

	async function removeMember(member: Member) {
		const name = formatNames({
			givenName: member.user.givenName,
			familyName: member.user.familyName,
			options: { givenNameUppercase: false, familyNameUppercase: false }
		});
		const text = m.confirmRemoveFromDelegation({ name });
		if (!(await confirmDialog({ text, danger: true, confirmLabel: m.removeMember() }))) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegationMember({ __args: { id: member.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

<div>
	<h3 class="mb-2 text-lg font-bold">{m.delegationMembers()}</h3>
	<div class="overflow-x-auto">
		<table class="table-sm table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					<th>{m.committee()}</th>
					<th><span class="sr-only">{m.actions()}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each members as member (member.id)}
					<tr class={member.user.id === userId ? 'bg-base-300/50 font-bold' : ''}>
						<td>
							<PersonName
								givenName={member.user.givenName}
								familyName={member.user.familyName}
								isHeadDelegate={member.isHeadDelegate}
							/>
						</td>
						<td>{member.assignedCommittee?.abbreviation ?? 'N/A'}</td>
						<td>
							<div class="flex justify-end gap-1">
								<OpenUserCardButton user={member.user} />
								<button
									class="btn btn-ghost btn-xs btn-square text-error"
									onclick={() => removeMember(member)}
									aria-label={m.removeMember()}
									title={m.removeMember()}
								>
									<i aria-hidden="true" class="ph-duotone ph-user-minus"></i>
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
