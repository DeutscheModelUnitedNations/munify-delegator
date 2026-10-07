<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { conferenceGroupLabel, groupConferencesByState } from './dashboard/conferenceGroups';
	import { fetchSelectableConferences } from './dashboard/conferenceSelector';

	/** The breadcrumb's conference crumb: names the current conference and switches to another. */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const conferences = $derived(await fetchSelectableConferences());
	const groups = $derived(groupConferencesByState(conferences));
	const current = $derived(conferences.find((conference) => conference.id === conferenceId));
</script>

<div class="dropdown">
	<div tabindex="0" role="button" class="btn btn-ghost btn-sm max-w-56 gap-1.5">
		<i class="fa-duotone fa-flag"></i>
		<span class="truncate font-semibold">{current?.title ?? m.conference()}</span>
		<i class="fa-solid fa-chevron-down text-base-content/50 text-[0.6rem]"></i>
	</div>
	<ul
		tabindex="-1"
		class="menu dropdown-content rounded-box bg-base-100 border-base-300 z-30 mt-2 max-h-96 w-72 flex-nowrap overflow-y-auto border p-2 shadow-xl"
	>
		<li>
			<a href={resolve('/dashboard')}>
				<i class="fa-duotone fa-grid-2 w-4"></i>
				{m.conferences()}
			</a>
		</li>
		{#each groups as group (group.key)}
			<li class="menu-title mt-2">{conferenceGroupLabel(group.key)}</li>
			{#each group.conferences as conference (conference.id)}
				<li>
					<a
						href={resolve('/(authenticated)/dashboard/[conferenceId]', {
							conferenceId: conference.id
						})}
						class={conference.id === conferenceId ? 'menu-active' : ''}
						aria-current={conference.id === conferenceId ? 'page' : undefined}
					>
						<span class="truncate">{conference.title}</span>
					</a>
				</li>
			{/each}
		{/each}
	</ul>
</div>
