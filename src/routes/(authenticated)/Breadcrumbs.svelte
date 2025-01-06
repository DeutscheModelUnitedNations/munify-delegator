<script lang="ts">
	import Breadcrumbs from '../../lib/components/Breadcrumbs.svelte';
	import type { PathSegment } from '../../lib/components/Breadcrumbs.svelte';
	import { availableLanguageTags } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import { graphql } from '$houdini';
	import type { LayoutServerLoadEvent } from './$types';
	import { browser } from '$app/environment';

	type Parameters = keyof LayoutServerLoadEvent['params'];

	const conferenceTitleQuery = graphql(`
		query ConferenceTitleQuery($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				title
			}
		}
	`);

	interface LocalizedBreadcrumb {
		translation: string;
		delayedLabel?: Promise<string>;
		icon: string;
	}

	const breadcrumbs: { [key: string]: LocalizedBreadcrumb } = {
		management: {
			translation: m.admininstration(),
			icon: 'bars-progress'
		},
		conferenceId: {
			translation: m.conference(),
			icon: 'flag'
		},
		delegations: {
			translation: m.delegations(),
			icon: 'users-viewfinder'
		},
		dashboard: {
			translation: m.dashboard(),
			icon: 'chart-pie'
		},
		registration: {
			translation: m.registration(),
			icon: 'envelope'
		},
		stats: {
			translation: m.statistics(),
			icon: 'chart-simple'
		},
		'create-delegation': {
			translation: m.createDelegation(),
			icon: 'plus'
		},
		'join-delegation': {
			translation: m.joinDelegation(),
			icon: 'arrow-right-to-arc'
		},
		individual: {
			translation: m.individualApplication(),
			icon: 'dice-one'
		},
		roleId: {
			translation: m.role(),
			icon: 'gavel'
		},
		'join-delegation-supervisor': {
			translation: m.supervisor(),
			icon: 'eye'
		},
		'my-account': {
			translation: m.myAccount(),
			icon: 'user'
		},
		configuration: {
			translation: m.settings(),
			icon: 'gears'
		},
		participants: {
			translation: m.participants(),
			icon: 'users'
		},
		individuals: {
			translation: m.singleParticipants(),
			icon: 'user'
		},
		supervisors: {
			translation: m.supervisors(),
			icon: 'eye'
		},
		plausibility: {
			translation: m.adminPlausibility(),
			icon: 'question'
		},
		seats: {
			translation: m.seats(),
			icon: 'chair-office'
		},
		committeeAssignment: {
			translation: m.committeeAssignment(),
			icon: 'arrows-turn-to-dots'
		},
		info: {
			translation: m.infos(),
			icon: 'info'
		},
		payment: {
			translation: m.payment(),
			icon: 'hand-holding-circle-dollar'
		},
		postalRegistration: {
			translation: m.postalRegistration(),
			icon: 'envelopes-bulk'
		},
		group: {
			translation: m.groupPayment(),
			icon: 'people-group'
		},
		delegation: {
			translation: m.delegationPayment(),
			icon: 'users-viewfinder'
		},
		single: {
			translation: m.singlePayment(),
			icon: 'user'
		}
	};

	function getBreadcrumb(segment: PathSegment<Parameters, boolean>): LocalizedBreadcrumb {
		const breadcrumb = breadcrumbs[segment.key];
		if (!breadcrumb) {
			console.warn(`Breadcrumb not found: ${segment.key}`);
			return {
				translation: segment.key,
				icon: 'question'
			};
		}

		if (segment.isParameter) {
			switch (segment.key) {
				case 'conferenceId':
					breadcrumb.delayedLabel = (async () => {
						//TODO we could probably load this data serverside
						// although this would prevent computational breadcrumbs which depend on client side data
						// it's alright for now I guess
						if (browser) {
							const r = await conferenceTitleQuery.fetch({
								variables: { conferenceId: segment.value }
							});
							return r.data?.findUniqueConference?.title ?? breadcrumb.translation;
						}

						return breadcrumb.translation;
					})();
					break;
				case 'roleId':
					//TODO
					break;

				default:
					break;
			}
		}
		return breadcrumb;
	}
</script>

<!-- ATTENTION: importObject is dir route specific. You cannot move this file without adjusting this
import path via the parameter! -->
<Breadcrumbs
	importObject={import.meta.glob('./**/+page.svelte')}
	availableLanguageTags={availableLanguageTags as any as string[]}
	delimeterSnippet="disabled"
	homePath="/"
>
	{#snippet pathSnippet(pathSegment: PathSegment<Parameters, boolean>)}
		<a class="btn btn-ghost btn-sm" href={pathSegment.href}>
			<i class="fa-duotone fa-{getBreadcrumb(pathSegment).icon}"></i>
			<p class="ml-2">
				{#if getBreadcrumb(pathSegment).delayedLabel}
					{#await getBreadcrumb(pathSegment).delayedLabel}
						<span>
							{getBreadcrumb(pathSegment).translation}
						</span>
					{:then value}
						<span>
							{value ?? getBreadcrumb(pathSegment).translation}
						</span>
					{/await}
				{:else}
					{getBreadcrumb(pathSegment).translation}
				{/if}
			</p>
		</a>
	{/snippet}
</Breadcrumbs>
