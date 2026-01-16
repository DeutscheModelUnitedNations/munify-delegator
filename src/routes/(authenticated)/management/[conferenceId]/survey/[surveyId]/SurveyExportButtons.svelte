<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/services/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import DownloadButton from '../../downloads/DownloadButton.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface SurveyOption {
		id: string;
		title: string;
		description: string;
		countSurveyAnswers: number;
		upperLimit: number;
	}

	interface Props {
		surveyTitle: string;
		options: SurveyOption[];
		surveyId: string;
		conferenceId: string;
	}

	let { surveyTitle, options, surveyId, conferenceId }: Props = $props();

	let loadingStates = $state<Record<string, boolean>>({});
	let exportDataCache: ExportData | null = null;

	// Types for the export data
	interface ExportUser {
		id: string;
		given_name: string;
		family_name: string;
		email: string | null;
		pronouns: string | null;
		birthday: Date | null;
	}

	interface ExportDelegationMember {
		user: ExportUser;
		delegation: {
			assignedNation: { alpha3Code: string } | null;
			assignedNonStateActor: { name: string } | null;
		};
		assignedCommittee: { name: string } | null;
	}

	interface ExportSingleParticipant {
		user: ExportUser;
		assignedRole: { name: string } | null;
	}

	interface ExportSurveyAnswer {
		id: string;
		option: { id: string };
		user: ExportUser;
	}

	interface ExportData {
		surveyAnswers: ExportSurveyAnswer[];
		delegationMembers: ExportDelegationMember[];
		singleParticipants: ExportSingleParticipant[];
		userRoleMap: SvelteMap<string, { roleType: string; roleName: string; committee: string }>;
	}

	// Query for fetching full export data on-demand
	const SurveyExportDataQuery = graphql(`
		query SurveyExportData($conferenceId: String!, $surveyId: String!) {
			findUniqueSurveyQuestion(where: { id: $surveyId }) {
				surveyAnswers {
					id
					option {
						id
					}
					user {
						id
						given_name
						family_name
						email
						pronouns
						birthday
					}
				}
			}
			findManyDelegationMembers(
				where: {
					conferenceId: { equals: $conferenceId }
					delegation: {
						OR: [
							{ assignedNationAlpha3Code: { not: { equals: null } } }
							{ assignedNonStateActorId: { not: { equals: null } } }
						]
					}
				}
			) {
				user {
					id
					given_name
					family_name
					email
					pronouns
					birthday
				}
				delegation {
					assignedNation {
						alpha3Code
					}
					assignedNonStateActor {
						name
					}
				}
				assignedCommittee {
					name
				}
			}
			findManySingleParticipants(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedRoleId: { not: { equals: null } }
				}
			) {
				user {
					id
					given_name
					family_name
					email
					pronouns
					birthday
				}
				assignedRole {
					name
				}
			}
		}
	`);

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	// Fetch and cache export data
	const fetchExportData = async (): Promise<ExportData> => {
		if (exportDataCache) return exportDataCache;

		const { data } = await SurveyExportDataQuery.fetch({
			variables: { conferenceId, surveyId }
		});

		const surveyAnswers = data?.findUniqueSurveyQuestion?.surveyAnswers ?? [];
		const delegationMembers = data?.findManyDelegationMembers ?? [];
		const singleParticipants = data?.findManySingleParticipants ?? [];

		// Build a map of userId -> role info
		const userRoleMap = new SvelteMap<
			string,
			{ roleType: string; roleName: string; committee: string }
		>();

		for (const dm of delegationMembers) {
			const nation = dm.delegation.assignedNation;
			const nsa = dm.delegation.assignedNonStateActor;

			if (nation) {
				userRoleMap.set(dm.user.id, {
					roleType: 'Delegation',
					roleName: getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
					committee: dm.assignedCommittee?.name ?? ''
				});
			} else if (nsa) {
				userRoleMap.set(dm.user.id, {
					roleType: 'NSA',
					roleName: nsa.name,
					committee: ''
				});
			}
		}

		for (const sp of singleParticipants) {
			if (sp.assignedRole) {
				userRoleMap.set(sp.user.id, {
					roleType: 'SingleParticipant',
					roleName: sp.assignedRole.name,
					committee: ''
				});
			}
		}

		exportDataCache = {
			surveyAnswers,
			delegationMembers,
			singleParticipants,
			userRoleMap
		};

		return exportDataCache;
	};

	// Format birthday as YYYY-MM-DD
	const formatBirthday = (birthday: Date | null): string => {
		if (!birthday) return '';
		const date = new Date(birthday);
		return date.toISOString().split('T')[0];
	};

	// Build a user data row for CSV export
	const buildUserRow = (
		user: ExportUser,
		roleInfo: { roleType: string; roleName: string; committee: string },
		additionalColumns: string[] = []
	): string[] => {
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

	const downloadAllResults = async () => {
		const key = 'all';
		setLoading(key, true);
		try {
			const exportData = await fetchExportData();
			const header = [...getUserHeaders(), m.surveyOption()];
			const data = exportData.surveyAnswers
				.map((answer) => {
					const option = options.find((o) => o.id === answer.option.id);
					const roleInfo = exportData.userRoleMap.get(answer.user.id) ?? {
						roleType: '',
						roleName: '',
						committee: ''
					};
					return buildUserRow(answer.user, roleInfo, [option?.title ?? '']);
				})
				.sort((a, b) => a[1].localeCompare(b[1])); // Sort by family name

			downloadCSV(header, data, `${surveyTitle}_results.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadNotAnswered = async () => {
		const key = 'not-answered';
		setLoading(key, true);
		try {
			const exportData = await fetchExportData();

			// Get all users who answered
			const answeredUserIds = new Set(exportData.surveyAnswers.map((a) => a.user.id));

			// Collect all conference participants who haven't answered
			const notAnsweredUsers: {
				user: ExportUser;
				roleInfo: typeof exportData.userRoleMap extends Map<string, infer V> ? V : never;
			}[] = [];

			for (const dm of exportData.delegationMembers) {
				if (!answeredUserIds.has(dm.user.id)) {
					const roleInfo = exportData.userRoleMap.get(dm.user.id);
					if (roleInfo) {
						notAnsweredUsers.push({ user: dm.user, roleInfo });
					}
				}
			}

			for (const sp of exportData.singleParticipants) {
				if (
					!answeredUserIds.has(sp.user.id) &&
					!notAnsweredUsers.some((u) => u.user.id === sp.user.id)
				) {
					const roleInfo = exportData.userRoleMap.get(sp.user.id);
					if (roleInfo) {
						notAnsweredUsers.push({ user: sp.user, roleInfo });
					}
				}
			}

			const header = getUserHeaders();
			const data = notAnsweredUsers
				.map(({ user, roleInfo }) => buildUserRow(user, roleInfo))
				.sort((a, b) => a[1].localeCompare(b[1])); // Sort by family name

			downloadCSV(header, data, `${surveyTitle}_not_answered.csv`);
		} finally {
			setLoading(key, false);
		}
	};

	const downloadByOption = async (option: SurveyOption) => {
		const key = `option-${option.id}`;
		setLoading(key, true);
		try {
			const exportData = await fetchExportData();
			const header = getUserHeaders();
			const data = exportData.surveyAnswers
				.filter((answer) => answer.option.id === option.id)
				.map((answer) => {
					const roleInfo = exportData.userRoleMap.get(answer.user.id) ?? {
						roleType: '',
						roleName: '',
						committee: ''
					};
					return buildUserRow(answer.user, roleInfo);
				})
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
