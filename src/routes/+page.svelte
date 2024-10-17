<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';
	// import UndrawCard from '$lib/components/UndrawCard.svelte';
	// import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';

	import SHLogo from '$assets/logo/mun-sh_logo.png';
	import BWLogo from '$assets/logo/munbw_logo.png';
	import UdteamUp from '$assets/undraw/team-up.svg';
	import UdProgress from '$assets/undraw/progress.svg';

	const munSh = {
		name: 'MUN-SH',
		longName: 'Model United Nations Schleswig-Holstein',
		location: 'Kiel',
		date: 'März / April',
		lang: 'Deutsch',
		website: 'https://mun-sh.de',
		logo: SHLogo
	};

	const munBw = {
		name: 'MUNBW',
		longName: 'Model United Nations Baden-Würtemberg',
		location: 'Stuttgart',
		date: 'Mai / Juni',
		lang: 'Deutsch',
		website: 'https://munbw.de',
		logo: BWLogo
	};

	let { data }: { data: PageData } = $props();
	let { ConferencesPreview } = $derived(data);

	const openRegistrations = $derived(
		$ConferencesPreview.data?.findManyConferences
			.filter((c) => {
				return (
					new Date(c.startRegistration).getTime() < new Date().getTime() &&
					new Date(c.startAssignment).getTime() > new Date().getTime()
				);
			})
			.sort(
				(a, b) =>
					new Date(b.startRegistration!).getTime() - new Date(a.startRegistration!).getTime()
			)
	);
</script>

{JSON.stringify(openRegistrations)}
