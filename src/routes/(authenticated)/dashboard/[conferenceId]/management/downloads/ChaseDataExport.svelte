<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { downloadJSON } from '$lib/utils/downloadHelpers';
	import { nanoid } from 'nanoid';
	import DownloadButton from './DownloadButton.svelte';
	import { buildChaseImport } from './chaseExport';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let loading = $state(false);

	const exportUser = {
		id: true,
		email: true,
		givenName: true,
		familyName: true
	} as const;

	/** One lean list query per table the import needs, run side by side. */
	async function fetchConferenceData() {
		const inConference = { where: { conferenceId: { eq: conferenceId } } };
		const [
			conference,
			committees,
			singleParticipants,
			conferenceSupervisors,
			nonStateActors,
			delegationMembers,
			teamMembers
		] = await Promise.all([
			client.query.conference({ __args: { id: conferenceId }, id: true, title: true }),
			client.query.committees({
				__args: inConference,
				id: true,
				name: true,
				abbreviation: true,
				agendaItems: { id: true, title: true }
			}),
			client.query.singleParticipants({
				__args: inConference,
				id: true,
				user: exportUser,
				assignedRole: { id: true }
			}),
			client.query.conferenceSupervisors({ __args: inConference, id: true, user: exportUser }),
			client.query.nonStateActors({
				__args: inConference,
				id: true,
				name: true,
				fontAwesomeIcon: true
			}),
			client.query.delegationMembers({
				__args: inConference,
				id: true,
				assignedCommittee: { id: true },
				user: exportUser,
				delegation: {
					id: true,
					assignedNation: { alpha3Code: true },
					assignedNonStateActor: { id: true }
				}
			}),
			client.query.teamMembers({ __args: inConference, id: true, role: true, user: exportUser })
		]);
		if (!conference) return undefined;
		return {
			id: conference.id,
			title: conference.title,
			committees,
			singleParticipants,
			conferenceSupervisors,
			nonStateActors,
			delegationMembers,
			teamMembers
		};
	}

	const getAndProcessData = async () => {
		loading = true;
		try {
			const [conferenceData, nations] = await Promise.all([
				fetchConferenceData(),
				client.query.nations({ alpha2Code: true, alpha3Code: true })
			]);

			if (!conferenceData) {
				alert(m.httpGenericError());
				return;
			}

			const transformedData = buildChaseImport(conferenceData, nations, () => nanoid(30));
			downloadJSON(transformedData, `chase_import_${conferenceData.title}.json`);
		} finally {
			loading = false;
		}
	};
</script>

<DownloadButton
	onclick={() => getAndProcessData()}
	title={m.chaseSeedData()}
	icon="fas fa-file-code"
	{loading}
/>
