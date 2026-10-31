<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import GenericWidget from '#lib/components/delegationStats/GenericWidget.svelte';
	import formatNames from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import SelectionInProgressNotice from '../Common/SelectionInProgressNotice.svelte';
	import SelectionStudentRow from './SelectionStudentRow.svelte';

	/** A supervisor's dashboard between the application deadline and the end of registration. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			supervisedDelegationMembers: {
				id: true,
				user: { givenName: true, familyName: true, pronouns: true },
				delegation: { applied: true }
			},
			supervisedSingleParticipants: {
				id: true,
				user: { givenName: true, familyName: true, pronouns: true },
				applied: true
			}
		})
	);

	type Student = ComponentProps<typeof SelectionStudentRow> & { id: string };

	const toStudent = ({
		id,
		user,
		participantType,
		applied
	}: {
		id: string;
		user: { givenName?: string | null; familyName?: string | null; pronouns?: string | null };
		participantType: Student['participantType'];
		applied: boolean;
	}): Student => ({
		id,
		name: formatNames({
			givenName: user.givenName ?? undefined,
			familyName: user.familyName ?? undefined
		}),
		pronouns: user.pronouns ?? '',
		participantType,
		applied
	});

	const students = $derived(
		[
			...supervisor.supervisedDelegationMembers.map((member) =>
				toStudent({
					id: member.id,
					user: member.user,
					participantType: 'delegation',
					applied: member.delegation.applied
				})
			),
			...supervisor.supervisedSingleParticipants.map((participant) =>
				toStudent({
					id: participant.id,
					user: participant.user,
					participantType: 'singleParticipant',
					applied: participant.applied
				})
			)
		].sort((a, b) => a.name.localeCompare(b.name))
	);

	const stats = $derived([
		{
			icon: 'users',
			title: m.studentsInSelectionProcess(),
			value: `${students.filter((s) => s.applied).length} / ${students.length}`,
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
			<i class="fa-sharp-duotone fa-solid fa-circle-info text-xl"></i>
			{m.noConnectedStudents()}
		</div>
	{/if}
</DashboardSection>
