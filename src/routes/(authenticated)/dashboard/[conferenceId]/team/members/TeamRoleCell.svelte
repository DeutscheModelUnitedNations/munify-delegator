<script lang="ts">
	import type { TeamroleEnum } from '#lib/api/rumbleClient/client';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import { conflictAwareToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { TEAM_ROLES } from './teamMembersQuery';

	/**
	 * A team member's role, changeable in place. Like the invitation dialog it offers every role and
	 * leaves it to the API to refuse one the caller may not hand out; a refused change shows the role
	 * the member still holds.
	 */
	interface Props {
		role: TeamroleEnum;
		onChange: (role: TeamroleEnum) => Promise<unknown>;
	}

	let { role, onChange }: Props = $props();

	let saving = $state(false);
	// The select shows this; it follows the live row, and goes back to it when a change is refused.
	let shown = $derived(role);

	async function change(value: string) {
		const next = TEAM_ROLES.find((candidate) => candidate === value);
		if (!next || next === role) return;
		shown = next;
		saving = true;
		try {
			const promise = onChange(next);
			toast.promise(promise, conflictAwareToastMessages);
			await promise;
		} catch {
			shown = role;
		} finally {
			saving = false;
		}
	}
</script>

<select
	class="select select-bordered select-sm"
	value={shown}
	disabled={saving}
	onclick={(e) => e.stopPropagation()}
	onchange={(e) => change(e.currentTarget.value)}
>
	{#each TEAM_ROLES as option (option)}
		<option value={option}>{translateTeamRole(option)}</option>
	{/each}
</select>
