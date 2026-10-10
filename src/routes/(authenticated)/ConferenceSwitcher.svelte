<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import {
		conferenceGroupIcon,
		conferenceGroupLabel,
		groupConferencesByState
	} from './dashboard/conferenceGroups';
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

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="btn btn-ghost btn-sm max-w-56 gap-1.5">
		<i class="fa-sharp-duotone fa-solid fa-flag"></i>
		<span class="truncate font-semibold">{current?.title ?? m.conference()}</span>
		<i class="fa-sharp-duotone fa-solid fa-chevron-down text-base-content/50 text-[0.6rem]"></i>
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<!-- the portal and collision handling keep the menu on screen whatever the bar clips -->
		<DropdownMenu.Content
			align="start"
			sideOffset={8}
			collisionPadding={8}
			class="rounded-box flex-col bg-base-100 z-50 max-h-[min(24rem,var(--bits-dropdown-menu-content-available-height))] w-72 overflow-y-auto p-2 shadow-xl outline-none"
		>
			{#each groups as group (group.key)}
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading
						class="text-base-content/60 mt-2 px-3 py-1 text-xs font-semibold"
					>
						<i class="{conferenceGroupIcon(group.key)} mr-1"></i>
						{conferenceGroupLabel(group.key)}
					</DropdownMenu.GroupHeading>
					{#each group.conferences as conference (conference.id)}
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<a
									{...props}
									href={resolve('/(authenticated)/dashboard/[conferenceId]', {
										conferenceId: conference.id
									})}
									class="flex items-center gap-2 rounded-field px-3 py-2 text-sm data-highlighted:bg-base-200 {conference.id ===
									conferenceId
										? 'bg-primary/10 text-primary font-semibold'
										: ''}"
									aria-current={conference.id === conferenceId ? 'page' : undefined}
								>
									<span class="truncate">{conference.title}</span>
								</a>
							{/snippet}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
