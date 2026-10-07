<script lang="ts">
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';

	/** The single participants applying the draft gives a different role, before and after. */
	interface Props {
		singles: { singleParticipantId: string; liveRoleId: string | null; roleId: string | null }[];
		customRoleName: (roleId: string | null) => string;
	}

	let { singles, customRoleName }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="table-sm table">
		<thead>
			<tr>
				<th>{m.singleParticipants()}</th>
				<th>{m.assignmentFrom()}</th>
				<th>{m.assignmentTo()}</th>
			</tr>
		</thead>
		<tbody>
			{#each singles as single (single.singleParticipantId)}
				<tr>
					<td>{codenamize(single.singleParticipantId)}</td>
					<td>{customRoleName(single.liveRoleId)}</td>
					<td>{customRoleName(single.roleId)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
