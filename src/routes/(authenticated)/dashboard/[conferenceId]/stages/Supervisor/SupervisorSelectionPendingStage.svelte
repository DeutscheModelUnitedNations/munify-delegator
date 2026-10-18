<script lang="ts">
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import SelectionInProgressNotice from '../Common/SelectionInProgressNotice.svelte';
	import SelectionStudentRow from './SelectionStudentRow.svelte';

	interface Props {
		supervisor: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueConferenceSupervisor']
		>;
	}

	let { supervisor }: Props = $props();

	interface StudentRow {
		id: string;
		name: string;
		pronouns: string;
		participantType: 'delegation' | 'singleParticipant';
		applied: boolean;
	}

	let students = $derived.by((): StudentRow[] => {
		const rows: StudentRow[] = [
			...supervisor.supervisedDelegationMembers.map((member) => ({
				id: member.id,
				name: formatNames(member.user.given_name, member.user.family_name),
				pronouns: member.user.pronouns ?? '',
				participantType: 'delegation' as const,
				applied: member.delegation.applied
			})),
			...supervisor.supervisedSingleParticipants.map((participant) => ({
				id: participant.id,
				name: formatNames(participant.user.given_name, participant.user.family_name),
				pronouns: participant.user.pronouns ?? '',
				participantType: 'singleParticipant' as const,
				applied: participant.applied
			}))
		];
		return rows.sort((a, b) => a.name.localeCompare(b.name));
	});

	let appliedCount = $derived(students.filter((student) => student.applied).length);

	const stats = $derived([
		{
			icon: 'users',
			title: m.studentsInSelectionProcess(),
			value: `${appliedCount} / ${students.length}`,
			desc: m.applicationCompletedTitle()
		}
	]);
</script>

<SelectionInProgressNotice />

<DashboardSection
	icon="users"
	title={m.yourStudents()}
	description={m.yourStudentsSelectionDescription()}
>
	{#if students.length > 0}
		<GenericWidget content={stats} />
		<div class="mt-4 overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>{m.name()}</th>
						<th>{m.pronouns()}</th>
						<th>{m.participationType()}</th>
						<th>{m.selectionProcess()}</th>
					</tr>
				</thead>
				<tbody>
					{#each students as student (student.id)}
						<SelectionStudentRow
							name={student.name}
							pronouns={student.pronouns}
							participantType={student.participantType}
							applied={student.applied}
						/>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fa-solid fa-circle-info text-xl"></i>
			{m.noConnectedStudents()}
		</div>
	{/if}
</DashboardSection>
