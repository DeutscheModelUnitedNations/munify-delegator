<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV } from '$lib/utils/downloadHelpers';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import DownloadButton from '../../downloads/DownloadButton.svelte';
	import {
		buildUserRoleMap,
		buildUserRow,
		byFamilyName,
		collectNotAnswered,
		roleInfoOf,
		type ExportDelegationMember,
		type ExportSingleParticipant,
		type ExportUser,
		type RoleInfo
	} from './surveyExport';

	interface Props {
		surveyId: string;
		conferenceId: string;
	}

	let { surveyId, conferenceId }: Props = $props();

	// The file names and one button per option; the rows themselves are fetched on click.
	const survey = $derived(
		await client.liveQuery.surveyQuestion({
			__args: { id: surveyId },
			id: true,
			title: true,
			options: { id: true, title: true }
		})
	);
	const surveyTitle = $derived(survey.title);
	const options = $derived(survey.options);

	type SurveyOption = (typeof options)[number];

	let loadingStates = $state<Record<string, boolean>>({});
	let exportDataCache: ExportData | null = null;

	interface ExportData {
		surveyAnswers: { id: string; option: { id: string }; user: ExportUser }[];
		delegationMembers: ExportDelegationMember[];
		singleParticipants: ExportSingleParticipant[];
		userRoleMap: Map<string, RoleInfo>;
	}

	const exportUser = {
		id: true,
		givenName: true,
		familyName: true,
		email: true,
		pronouns: true,
		birthday: true
	} as const;

	const setLoading = (key: string, value: boolean) => {
		loadingStates = { ...loadingStates, [key]: value };
	};

	// Fetch and cache export data
	const fetchExportData = async (): Promise<ExportData> => {
		if (exportDataCache) return exportDataCache;

		const [survey, delegationMembers, singleParticipants] = await Promise.all([
			client.query.surveyQuestion({
				__args: { id: surveyId },
				surveyAnswers: { id: true, option: { id: true }, user: exportUser }
			}),
			client.query.delegationMembers({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						delegation: {
							OR: [
								{ assignedNationAlpha3Code: { isNotNull: true } },
								{ assignedNonStateActorId: { isNotNull: true } }
							]
						}
					}
				},
				user: exportUser,
				delegation: {
					assignedNation: { alpha3Code: true },
					assignedNonStateActor: { name: true }
				},
				assignedCommittee: { name: true }
			}),
			client.query.singleParticipants({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						assignedRoleId: { isNotNull: true }
					}
				},
				user: exportUser,
				assignedRole: { name: true }
			})
		]);

		exportDataCache = {
			surveyAnswers: survey?.surveyAnswers ?? [],
			delegationMembers,
			singleParticipants,
			userRoleMap: buildUserRoleMap(
				delegationMembers,
				singleParticipants,
				getFullTranslatedCountryNameFromISO3Code
			)
		};

		return exportDataCache;
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
					return buildUserRow(answer.user, roleInfoOf(exportData.userRoleMap, answer.user.id), [
						option?.title ?? ''
					]);
				})
				.sort(byFamilyName);

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

			const answeredUserIds = new Set(exportData.surveyAnswers.map((a) => a.user.id));
			const notAnsweredUsers = collectNotAnswered(
				answeredUserIds,
				[...exportData.delegationMembers, ...exportData.singleParticipants],
				exportData.userRoleMap
			);

			const header = getUserHeaders();
			const data = notAnsweredUsers
				.map(({ user, roleInfo }) => buildUserRow(user, roleInfo))
				.sort(byFamilyName);

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
				.map((answer) =>
					buildUserRow(answer.user, roleInfoOf(exportData.userRoleMap, answer.user.id))
				)
				.sort(byFamilyName);

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
