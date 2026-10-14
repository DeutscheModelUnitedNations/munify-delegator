<script lang="ts">
	import InfoGrid from '$lib/components/infoGrid';
	import { m } from '$lib/paraglide/messages';

	/** What an application said about the applicants: their school, experience and motivation. */
	interface Props {
		school: string | null;
		experience: string | null;
		motivation: string | null;
	}

	let { school, experience, motivation }: Props = $props();
</script>

<InfoGrid.Entry title={m.schoolOrInstitution()} fontAwesomeIcon="school" content={school} />
<InfoGrid.Entry title={m.experience()} fontAwesomeIcon="compass" content={experience} />
<InfoGrid.Entry title={m.motivation()} fontAwesomeIcon="fire-flame-curved" content={motivation} />
