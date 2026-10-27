<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import SquareButtonWithLoadingState from '#lib/components/SquareButtonWithLoadingState.svelte';
	import AddRoleApplication from './AddRoleApplication.svelte';

	/** The roles a single participant applies for, which they add and withdraw until applying. */
	interface Props {
		conferenceId: string;
		singleParticipantId: string;
		applied: boolean;
		/** The application's answers, sent again unchanged with a role that is added. */
		answers: { motivation: string | null; experience: string | null };
		roles: {
			id: string;
			name: string | null;
			description: string | null;
			fontAwesomeIcon?: string | null;
		}[];
	}

	let { conferenceId, singleParticipantId, applied, answers, roles }: Props = $props();

	/** The last application cannot be withdrawn on its own; that is what deleting them all is for. */
	const isOnlyApplication = $derived(roles.length === 1);

	/** Roles store their icon with or without the `fa-` prefix. */
	const iconOf = (role: Props['roles'][number]) =>
		role.fontAwesomeIcon?.replace(/^fa-/, '') || 'masks-theater';

	const deleteApplication = async (id: string) => {
		if (!(await confirmDialog({ text: m.deleteApplicationConfirmation(), danger: true }))) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipantId, unApplyForRolesIdList: [id] },
			id: true,
			appliedForRoles: { id: true }
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<DashboardSection
	id="application-roles"
	icon="masks-theater"
	title={m.roleApplications()}
	description={applied ? undefined : m.todoApplyForRoleHelp()}
>
	{#if roles.length === 0}
		<div class="alert alert-warning alert-soft text-sm">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
			{m.noRoleApplications()}
		</div>
	{:else}
		<ul class="divide-base-200 divide-y">
			{#each roles as role (role.id)}
				<li class="flex items-center gap-4 py-3">
					<i
						class="fa-sharp-duotone fa-solid fa-{iconOf(role)} text-primary w-8 text-center text-xl"
					></i>
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="font-medium">{role.name}</span>
						<span class="text-base-content/60 text-sm">{role.description}</span>
					</div>
					{#if !applied}
						<SquareButtonWithLoadingState
							cssClass={isOnlyApplication ? 'opacity-10' : ''}
							disabled={isOnlyApplication}
							icon="trash"
							onClick={async () => deleteApplication(role.id)}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if !applied}
		<AddRoleApplication {conferenceId} {answers} appliedRoleIds={roles.map((role) => role.id)} />
	{/if}
</DashboardSection>
