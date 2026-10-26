<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	/**
	 * What the account says beyond the person's details: the language their mails are written in,
	 * since when it exists (which helps judging a possible duplicate) and the newsletters it opted
	 * into. Read-only: only the person changes these. Laid out like the profile page's login card.
	 */
	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const account = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			id: true,
			locale: true,
			createdAt: true,
			preferredUsername: true,
			wantsToReceiveGeneralInformation: true,
			wantsJoinTeamInformation: true
		})
	);

	const language = $derived(
		new Intl.DisplayNames([getLocale()], { type: 'language' }).of(account.locale) ?? account.locale
	);
</script>

<!-- Icon, label above the value: the profile page's `AccountRow` -->
{#snippet row(icon: string, label: string, value: string, mono = false)}
	<div class="flex items-center gap-3">
		<i class="fa-sharp-duotone fa-solid fa-{icon} text-base-content/60 w-5 text-center"></i>
		<div class="min-w-0 flex-1">
			<div class="text-base-content/60 text-xs">{label}</div>
			<div class="truncate {mono ? 'font-mono' : ''}">{value}</div>
		</div>
	</div>
{/snippet}

{#snippet optIn(label: string, value: boolean)}
	<li class="flex items-center gap-3">
		<i
			class="fa-sharp-duotone fa-solid w-5 text-center {value
				? 'fa-circle-check text-success'
				: 'fa-circle-xmark text-base-content/40'}"
		></i>
		<span class={value ? '' : 'text-base-content/60'}>{label}</span>
	</li>
{/snippet}

<section class="flex flex-col gap-3">
	<h3 class="text-lg font-bold">
		<i class="fa-sharp-duotone fa-solid fa-shield-halved mr-1"></i>
		{m.userCardAccount()}
	</h3>
	<div class="bg-base-200 rounded-box flex flex-col gap-5 p-5">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{@render row('user', m.loginName(), account.preferredUsername, true)}
			{@render row('language', m.userCardMailLanguage(), language)}
			{@render row(
				'calendar-plus',
				m.userCardAccountCreated(),
				account.createdAt.toLocaleDateString(getLocale(), { dateStyle: 'medium' })
			)}
		</div>
		<div class="border-base-300 flex flex-col gap-3 border-t pt-4">
			<div class="text-base-content/60 flex items-center gap-2 text-xs">
				<i class="fa-sharp-duotone fa-solid fa-envelope-open-text"></i>
				{m.newsletters()}
			</div>
			<ul class="flex flex-col gap-2 text-sm">
				{@render optIn(m.receiveGeneralInformation(), account.wantsToReceiveGeneralInformation)}
				{@render optIn(m.receiveJoinTeamInformation(), account.wantsJoinTeamInformation)}
			</ul>
		</div>
	</div>
</section>
