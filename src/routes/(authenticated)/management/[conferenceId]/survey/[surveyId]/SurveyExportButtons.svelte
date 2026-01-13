<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { downloadCSV } from '$lib/services/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import DownloadButton from '../../downloads/DownloadButton.svelte';

	interface SurveyOption {
		id: string;
		title: string;
		description: string;
		countSurveyAnswers: number;
		upperLimit: number;
	}

	interface DelegationMembership {
		id: string;
		conference: { id: string };
		delegation: {
			assignedNation: { alpha3Code: string } | null;
			assignedNonStateActor: { name: string } | null;
		};
		assignedCommittee: { name: string } | null;
	}

	interface SingleParticipant {
		id: string;
		conference: { id: string };
		assignedRole: { name: string } | null;
	}

	interface User {
		id: string;
		given_name: string;
		family_name: string;
		email: string | null;
		pronouns: string | null;
		birthday: Date | null;
		delegationMemberships: DelegationMembership[];
		singleParticipant: SingleParticipant[];
	}

	interface SurveyAnswer {
		id: string;
		option: { id: string };
		user: User;
	}

	interface Props {
		surveyTitle: string;
		options: SurveyOption[];
		surveyAnswers: SurveyAnswer[];
		notAnsweredParticipants: User[];
		conferenceId: string;
	}

	let { surveyTitle, options, surveyAnswers, notAnsweredParticipants, conferenceId }: Props =
		$props();

	let loadingStates = $state<Record<string, boolean>>({});

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	// Helper to get user's conference role information
	const getUserRoleInfo = (
		user: User
	): { roleType: string; roleName: string; committee: string } => {
		// Check delegation memberships for this conference
		const membership = user.delegationMemberships.find((m) => m.conference.id === conferenceId);
		if (membership) {
			const nation = membership.delegation.assignedNation;
			const nsa = membership.delegation.assignedNonStateActor;

			if (nation) {
				return {
					roleType: 'Delegation',
					roleName: getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
					committee: membership.assignedCommittee?.name ?? ''
				};
			}
			if (nsa) {
				return {
					roleType: 'NSA',
					roleName: nsa.name,
					committee: ''
				};
			}
		}

		// Check single participant for this conference
		const singleParticipant = user.singleParticipant.find(
			(sp) => sp.conference.id === conferenceId
		);
		if (singleParticipant?.assignedRole) {
			return {
				roleType: 'SingleParticipant',
				roleName: singleParticipant.assignedRole.name,
				committee: ''
			};
		}

		return { roleType: '', roleName: '', committee: '' };
	};

	// Format birthday as YYYY-MM-DD
	const formatBirthday = (birthday: Date | null): string => {
		if (!birthday) return '';
		const date = new Date(birthday);
		return date.toISOString().split('T')[0];
	};

	// Build a user data row for CSV export
	const buildUserRow = (user: User, additionalColumns: string[] = []): string[] => {
		const roleInfo = getUserRoleInfo(user);
		return [
			user.id,
			user.family_name ?? '',
			user.given_name ?? '',
			user.email ?? '',
			user.pronouns ?? '',
			formatBirthday(user.birthday),
			roleInfo.roleType,
			roleInfo.roleName,
			roleInfo.committee,
			...additionalColumns
		];
	};

	// CSV headers for user data
	const getUserHeaders = (): string[] => [
		m.userId(),
		m.familyName(),
		m.givenName(),
		m.email(),
		m.pronouns(),
		m.birthDate(),
		m.roleType(),
		m.role(),
		m.committee()
	];

	const downloadAllResults = () => {
		const key = 'all';
		setLoading(key, true);
		try {
			const header = [...getUserHeaders(), m.surveyOption()];
			const data = surveyAnswers
				.map((answer) => {
					const option = options.find((o) => o.id === answer.option.id);
					return buildUserRow(answer.user, [option?.title ?? '']);
				})
				.sort((a, b) => a[1].localeCompare(b[1])); // Sort by family name

			downloadCSV(header, data, `${surveyTitle}_results.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadNotAnswered = () => {
		const key = 'not-answered';
		setLoading(key, true);
		try {
			const header = getUserHeaders();
			const data = notAnsweredParticipants
				.map((user) => buildUserRow(user))
				.sort((a, b) => a[1].localeCompare(b[1])); // Sort by family name

			downloadCSV(header, data, `${surveyTitle}_not_answered.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadByOption = (option: SurveyOption) => {
		const key = `option-${option.id}`;
		setLoading(key, true);
		try {
			const header = getUserHeaders();
			const data = surveyAnswers
				.filter((answer) => answer.option.id === option.id)
				.map((answer) => buildUserRow(answer.user))
				.sort((a, b) => a[1].localeCompare(b[1])); // Sort by family name

			downloadCSV(header, data, `${surveyTitle}_${option.title}.csv`);
		} finally {
			setLoading(key, false);
		}
	};
</script>

<DownloadButton
	onclick={downloadAllResults}
	title={m.exportAllResults()}
	loading={loadingStates['all'] ?? false}
/>
<DownloadButton
	onclick={downloadNotAnswered}
	title={m.exportNotAnswered()}
	loading={loadingStates['not-answered'] ?? false}
/>
{#each options as option (option.id)}
	<DownloadButton
		onclick={() => downloadByOption(option)}
		title={m.exportByOption({ option: option.title })}
		loading={loadingStates[`option-${option.id}`] ?? false}
	/>
{/each}
