<script lang="ts">
	import InfoGrid from '#lib/components/infoGrid/index';
	import { m } from '#lib/paraglide/messages';

	/** An application in short: the applicants' own schools, their experience and motivation. */
	interface Props {
		school: string | null;
		experience: string | null;
		motivation: string | null;
	}

	let { school, experience, motivation }: Props = $props();
</script>

<InfoGrid.Entry title={m.schoolOrInstitution()} icon="graduation-cap" content={school} />
<InfoGrid.Entry title={m.experience()} icon="compass" content={experience} />
<InfoGrid.Entry title={m.motivation()} icon="fire" content={motivation} />
