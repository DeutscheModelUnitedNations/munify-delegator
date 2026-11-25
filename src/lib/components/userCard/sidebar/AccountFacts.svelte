<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import Fact from '../Fact.svelte';

	/**
	 * What the account says beyond the person's details: the language their mails are written in,
	 * since when it exists (which helps judging a possible duplicate) and the newsletters it opted
	 * into. Read-only: only the person changes these.
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

{#snippet optIn(label: string, value: boolean)}
	<li class="flex items-start gap-2 text-sm {value ? '' : 'text-base-content/60'}">
		<i
			aria-hidden="true"
			class="ph-duotone mt-0.5 {value
				? 'ph-check-circle text-success'
				: 'ph-x-circle text-base-content/40'}"
		></i>
		{label}
	</li>
{/snippet}

<dl class="border-base-content/10 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-3">
	<Fact label={m.loginName()} icon="at" value={account.preferredUsername} mono class="col-span-2" />
	<Fact label={m.userCardMailLanguage()} icon="translate" value={language} />
	<Fact
		label={m.userCardAccountCreated()}
		icon="calendar-plus"
		value={account.createdAt.toLocaleDateString(getLocale(), { dateStyle: 'medium' })}
	/>
	<Fact label={m.newsletters()} icon="envelope-open" class="col-span-2">
		<ul class="flex flex-col">
			{@render optIn(m.receiveGeneralInformation(), account.wantsToReceiveGeneralInformation)}
			{@render optIn(m.receiveJoinTeamInformation(), account.wantsJoinTeamInformation)}
		</ul>
	</Fact>
</dl>
