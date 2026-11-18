<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import {
		conferenceGroupIcon,
		conferenceGroupLabel,
		groupConferencesByState
	} from './dashboard/conferenceGroups';
	import { fetchSelectableConferences } from './dashboard/conferenceSelector';

	/**
	 * Names the current conference and switches to another: the head of the conference's side
	 * navigation, and the breadcrumb's conference crumb wherever there is no such menu.
	 */
	interface Props {
		conferenceId: string;
		/** Drawn as the side navigation's head rather than as a crumb */
		inMenu?: boolean;
	}

	let { conferenceId, inMenu = false }: Props = $props();

	const conferences = $derived(await fetchSelectableConferences());
	const groups = $derived(groupConferencesByState(conferences));
	const current = $derived(conferences.find((conference) => conference.id === conferenceId));
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={inMenu
			? 'btn btn-outline border-base-300 btn-block h-auto min-h-10 min-w-0 max-w-full flex-nowrap justify-start gap-2 py-2 text-left'
			: 'btn btn-ghost btn-sm max-w-56 gap-1.5 max-sm:px-1.5'}
	>
		<i aria-hidden="true" class="ph-duotone ph-flag"></i>
		<span class={['min-w-0 truncate font-semibold', inMenu ? 'flex-1' : 'crumb-label']}>
			{current?.title ?? m.conference()}
		</span>
		<i aria-hidden="true" class="ph-duotone ph-caret-down text-base-content/50 text-[0.6rem]"></i>
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
						<i aria-hidden="true" class="{conferenceGroupIcon(group.key)} mr-1"></i>
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

<style>
	@media (width < 40rem) {
		:global(.breadcrumbs li:not(:last-child)) .crumb-label {
			display: none;
		}
	}
</style>
