<script lang="ts">
	import { slide } from 'svelte/transition';
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import RoleChoiceGrid from '#lib/components/registration/RoleChoiceGrid.svelte';

	/** Another role for a single participant's application, chosen right where the roles are listed. */
	interface Props {
		conferenceId: string;
		/** The application's answers, sent again unchanged with the role that is added. */
		answers: { motivation: string | null; experience: string | null };
		appliedRoleIds: string[];
	}

	let { conferenceId, answers, appliedRoleIds }: Props = $props();

	let adding = $state(false);

	// The answers go along unchanged: the mutation saves them with the role it adds.
	const addApplication = async (roleId: string) => {
		const promise = client.mutate.createSingleParticipant({
			__args: { conferenceId, roleId, ...answers },
			id: true,
			appliedForRoles: { id: true }
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		adding = false;
	};
</script>

{#if adding}
	<div class="border-base-200 mt-4 border-t pt-4" transition:slide={{ duration: 300 }}>
		<RoleChoiceGrid
			{conferenceId}
			excludeIds={appliedRoleIds}
			actionLabel={m.add()}
			onChoose={(role) => addApplication(role.id)}
		/>
		<button class="btn btn-ghost btn-sm mt-4" type="button" onclick={() => (adding = false)}>
			{m.cancel()}
		</button>
	</div>
{:else}
	<button class="btn btn-primary mt-4 self-start" type="button" onclick={() => (adding = true)}>
		<i class="fa-sharp-duotone fa-solid fa-plus"></i>
		{m.addAnotherApplication()}
	</button>
{/if}
