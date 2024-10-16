<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Fuse from 'fuse.js';

	interface AvailableIcon {
		fontAwesomeIcon: string;
		additionalTags: string[];
	}
	let searchTerm = $state('');

	const availableIcons: AvailableIcon[] = [
		//TODO: these should be i18n'd
		{ fontAwesomeIcon: 'fa-sun', additionalTags: ['sun', 'sonne'] },
		{ fontAwesomeIcon: 'fa-phone', additionalTags: ['telefon', 'phone'] },
		{ fontAwesomeIcon: 'fa-envelope', additionalTags: ['envelope', 'umschlag', 'brief', 'letter'] },
		{ fontAwesomeIcon: 'fa-paperclip', additionalTags: ['paperclip', 'büroklammer'] },
		{ fontAwesomeIcon: 'fa-file', additionalTags: ['file', 'datei'] },
		{ fontAwesomeIcon: 'fa-pen', additionalTags: ['pen', 'stift'] },
		{ fontAwesomeIcon: 'fa-book', additionalTags: ['book', 'buch'] },
		{ fontAwesomeIcon: 'fa-globe', additionalTags: ['globe', 'welt', 'globus'] },
		{ fontAwesomeIcon: 'fa-compass', additionalTags: ['compass', 'kompass'] },
		{ fontAwesomeIcon: 'fa-helmet-un', additionalTags: ['helmet', 'helm'] },
		{ fontAwesomeIcon: 'fa-truck-field-un', additionalTags: ['truck', 'lastwagen', 'auto'] },
		{ fontAwesomeIcon: 'fa-building-un', additionalTags: ['bulding', 'gebäude'] },
		{ fontAwesomeIcon: 'fa-building', additionalTags: ['building', 'gebäude'] },
		{ fontAwesomeIcon: 'fa-people-simple', additionalTags: ['people', 'menschen'] },
		{ fontAwesomeIcon: 'fa-camera', additionalTags: ['camera', 'kamera'] },
		{ fontAwesomeIcon: 'fa-dove', additionalTags: ['dove', 'taube', 'frieden', 'peace'] },
		{
			fontAwesomeIcon: 'fa-scale-unbalanced',
			additionalTags: ['scale', 'waage', 'justice', 'recht', 'justiz']
		},
		{
			fontAwesomeIcon: 'fa-newspaper',
			additionalTags: ['newspaper', 'zeitung', 'nachrichten', 'presse']
		},
		{
			fontAwesomeIcon: 'fa-landmark',
			additionalTags: ['landmark', 'wahrzeichen', 'gebäude', 'gericht']
		},
		{
			fontAwesomeIcon: 'fa-magnifying-glass',
			additionalTags: ['magnifying', 'glass', 'lupe', 'sonne']
		}
	];
	const fuseInstance = new Fuse(availableIcons, {
		keys: ['fontAwesomeIcon', 'additionalTags']
	});
	let sortedIcons = $derived(
		searchTerm !== '' ? fuseInstance.search(searchTerm).map((i) => i.item) : availableIcons
	);
	let {
		selectedIcon = $bindable<AvailableIcon['fontAwesomeIcon']>(availableIcons[0].fontAwesomeIcon)
	} = $props();
</script>

<details class="dropdown">
	<summary class="btn m-1">
		<i class="fa-duotone {selectedIcon}"></i>

		{m.pickIcon()}</summary
	>
	<ul class="menu dropdown-content z-[1] rounded-md bg-base-200 p-6 shadow">
		<label class="input input-bordered mb-3 flex items-center gap-2">
			<input bind:value={searchTerm} type="text" class="grow" placeholder={m.search()} />
		</label>
		<div class="flex max-h-44 max-w-80 flex-wrap justify-between overflow-auto">
			{#each sortedIcons as icon}
				<li>
					<button onclick={() => (selectedIcon = icon.fontAwesomeIcon)} aria-label="Select icon">
						<i class="fa-duotone flex {icon.fontAwesomeIcon} text-2xl"></i>
					</button>
				</li>
			{/each}
		</div>
	</ul>
</details>
