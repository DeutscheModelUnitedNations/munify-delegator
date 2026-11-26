<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import NsaCardSection from '../NsaCardSection.svelte';
	import Section from '../ui/Section.svelte';
	import AccessRows from './AccessRows.svelte';
	import CertificateSection from './CertificateSection.svelte';

	/** The person at the conference: whether they took part, their cards and the certificate. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();
</script>

<Section icon="door-open" title={m.userCardOnSite()}>
	<AccessRows {userId} {conferenceId} />
	<NsaCardSection {userId} {conferenceId} />
	<CertificateSection {userId} {conferenceId} />
</Section>
