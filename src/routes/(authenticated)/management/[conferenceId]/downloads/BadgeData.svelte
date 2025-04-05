<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import DownloadElement from './DownloadElement.svelte';
	import DownloadSection from './DownloadSection.svelte';
	import { stringify } from 'csv-stringify/browser/esm/sync';

	interface Props {
		committees: {
			id: string;
			name: string;
			abbreviation: string;
		}[];
		loading: boolean;
		conferenceId: string;
	}

	let { committees, loading = $bindable(), conferenceId }: Props = $props();

	const committeeBadgeDataDownloadQuery = graphql(`
		query CommitteeBadgeDataDownloadQuery($committeeId: String!) {
			findUniqueCommittee(where: { id: $committeeId }) {
				id
				abbreviation
				delegationMembers {
					id
					user {
						id
						given_name
						family_name
						pronouns
						conferenceParticipantStatus {
							id
							mediaConsentStatus
							conference {
								id
							}
						}
					}
					delegation {
						id
						assignedNation {
							alpha2Code
							alpha3Code
						}
					}
				}
			}
		}
	`);

	const nonStateActorBadgeDataDownloadQuery = graphql(`
		query NSABadgeDataDownloadQuery($conferenceId: String!) {
			findManyDelegationMembers(
				where: {
					conferenceId: { equals: $conferenceId }
					delegation: { assignedNonStateActorId: { not: { equals: null } } }
				}
			) {
				id
				user {
					id
					given_name
					family_name
					pronouns
					conferenceParticipantStatus {
						id
						mediaConsentStatus
						conference {
							id
						}
					}
				}
				delegation {
					id
					assignedNonStateActor {
						id
						name
						abbreviation
					}
				}
			}
		}
	`);

	const singleParticipantsBadgeDataDownloadQuery = graphql(`
		query SingleParticipantsBadgeDataDownloadQuery($conferenceId: String!) {
			findManySingleParticipants(
				where: {
					conferenceId: { equals: $conferenceId }
					assignedRoleId: { not: { equals: null } }
				}
			) {
				id
				user {
					id
					given_name
					family_name
					pronouns
					conferenceParticipantStatus {
						id
						mediaConsentStatus
						conference {
							id
						}
					}
				}
				assignedRole {
					name
				}
			}
		}
	`);

	const downloadCSV = (
		badgeData: {
			name: string;
			committee?: string | null;
			countryName: string;
			countryAlpha2Code?: string | null;
			alternativeImage?: string | null;
			pronouns?: string | null;
		}[],
		filename: string
	) => {
		const header = [
			'name',
			'committee',
			'countryName',
			'countryAlpha2Code',
			'alternativeImage',
			'pronouns'
		];
		const csv = [
			header,
			...badgeData.map((x) => [
				x.name,
				x.committee,
				x.countryName,
				x.countryAlpha2Code,
				x.alternativeImage,
				x.pronouns
			])
		];
		const blob = new Blob([stringify(csv, { delimiter: ';' })], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const getCommitteeBadgeData = async (committeeId: string) => {
		loading = true;
		const res = await committeeBadgeDataDownloadQuery.fetch({ variables: { committeeId } });
		const resData = res.data?.findUniqueCommittee;

		if (res.errors || !resData) {
			console.error(res.errors);
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		const badgeData = resData.delegationMembers
			.filter((member) => !!member.delegation.assignedNation)
			.map((member) => ({
				name: formatNames(member.user.given_name, member.user.family_name, {
					familyNameUppercase: false
				}),
				committee: resData.abbreviation,
				countryName: getFullTranslatedCountryNameFromISO3Code(
					member.delegation.assignedNation!.alpha3Code
				),
				countryAlpha2Code: member.delegation.assignedNation!.alpha2Code,
				alternativeImage: '',
				pronouns: member.user.pronouns,
				mediaConsentStatus:
					member.user.conferenceParticipantStatus.find((conference) => {
						return conference.conference.id === conferenceId;
					})?.mediaConsentStatus ?? 'NOT_SET'
			}));

		downloadCSV(badgeData, `${resData.abbreviation}_badge_data_${new Date().toISOString()}.csv`);
		loading = false;
	};

	const getNSAData = async () => {
		loading = true;
		const res = await nonStateActorBadgeDataDownloadQuery.fetch({ variables: { conferenceId } });
		const resData = res.data?.findManyDelegationMembers;

		if (res.errors || !resData) {
			console.error(res.errors);
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		const badgeData = resData
			.filter((member) => !!member.delegation.assignedNonStateActor)
			.map((member) => ({
				name: formatNames(member.user.given_name, member.user.family_name, {
					familyNameUppercase: false
				}),
				countryName: member.delegation.assignedNonStateActor!.name,
				countryAlpha2Code: 'un',
				alternativeImage: '',
				pronouns: member.user.pronouns,
				mediaConsentStatus:
					member.user.conferenceParticipantStatus.find((conference) => {
						return conference.conference.id === conferenceId;
					})?.mediaConsentStatus ?? 'NOT_SET'
			}));

		downloadCSV(badgeData, `NSA_badge_data_${new Date().toISOString()}.csv`);
		loading = false;
	};

	// Refactored function for single participants badge data download
	const getSingleParticipantsData = async () => {
		loading = true;
		const res = await singleParticipantsBadgeDataDownloadQuery.fetch({
			variables: { conferenceId }
		});
		const resData = res.data?.findManySingleParticipants;

		if (res.errors || !resData) {
			console.error(res.errors);
			alert(m.httpGenericError());
			loading = false;
			return;
		}

		const badgeData = resData
			.filter((member) => !!member.assignedRole)
			.map((member) => ({
				name: formatNames(member.user.given_name, member.user.family_name, {
					familyNameUppercase: false
				}),
				countryName: member.assignedRole!.name,
				countryAlpha2Code: 'un',
				alternativeImage: '',
				pronouns: member.user.pronouns,
				mediaConsentStatus:
					member.user.conferenceParticipantStatus.find((conference) => {
						return conference.conference.id === conferenceId;
					})?.mediaConsentStatus ?? 'NOT_SET'
			}));

		downloadCSV(badgeData, `single_participants_badge_data_${new Date().toISOString()}.csv`);
		loading = false;
	};
</script>

<DownloadSection title={'Tabellen für Schildergenerator'}>
	{#each committees as committee}
		<DownloadElement
			btnClick={() => getCommitteeBadgeData(committee.id)}
			title={committee.name}
			bind:loading
		/>
	{/each}
	<DownloadElement btnClick={() => getNSAData()} title={m.nonStateActors()} bind:loading />
	<DownloadElement
		btnClick={() => getSingleParticipantsData()}
		title={m.singleParticipants()}
		bind:loading
	/>
</DownloadSection>
