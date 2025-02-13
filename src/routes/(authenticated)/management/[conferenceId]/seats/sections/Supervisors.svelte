<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import type { SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import DownloadSupervisorDataBtn from '../downloads/DownloadSupervisorDataBtn.svelte';

	interface Props {
		supervisors: SeatsQuery$result['findManyConferenceSupervisors'];
		conferenceId: string;
	}

	let { supervisors, conferenceId }: Props = $props();
</script>

{#snippet downloadSupervisorDataBtn()}
	<DownloadSupervisorDataBtn {conferenceId} />
{/snippet}

<SeatsTableSection title={m.supervisors()} downloadButton={downloadSupervisorDataBtn}>
	<thead>
		<tr>
			<td>
				<i class="fa-duotone fa-users"></i>
			</td>
			<td>
				<i class="fa-duotone fa-sigma"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td class="w-full">
				{#if supervisors.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each supervisors as supervisor}
							<InitialsButton
								given_name={supervisor.user.given_name}
								family_name={supervisor.user.family_name}
								href={`/management/${conferenceId}/participants?filter=${supervisor.user.id}`}
							/>
						{/each}
					</div>
				{:else}
					<i class="fas fa-dash text-gray-400"></i>
				{/if}
			</td>
			<td>
				{supervisors.length ?? 0}
			</td>
		</tr>
	</tbody>
</SeatsTableSection>
