<!--
	@component
	One function of a team member as a switch that saves on its own: in a committee (chair,
	consultant), for a custom role (its support) or, without either, for the whole conference
	(trusted person).
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		teamMemberId: string;
		kind: 'CHAIR' | 'CONSULTANT' | 'TRUSTED_PERSON' | 'ROLE_SUPPORT';
		committeeId?: string;
		/** The custom role of a `ROLE_SUPPORT` */
		roleId?: string;
		/** The function's id while the member holds it */
		heldId?: string;
		label: string;
	}

	let { teamMemberId, kind, committeeId, roleId, heldId, label }: Props = $props();

	async function save(input: HTMLInputElement) {
		try {
			if (heldId) {
				await client.mutate.removeTeamFunction({ __args: { id: heldId } });
			} else {
				await client.mutate.giveTeamFunction({
					__args: { teamMemberId, committeeId, roleId, kind },
					id: true
				});
			}
		} catch {
			input.checked = !!heldId;
			toast.error(m.chatSaveFailed());
		}
	}
</script>

<input
	type="checkbox"
	class="toggle toggle-primary toggle-sm"
	checked={!!heldId}
	aria-label={label}
	onchange={(event) => save(event.currentTarget)}
/>
