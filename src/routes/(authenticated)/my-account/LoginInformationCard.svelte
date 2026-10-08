<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { configPublic } from '$config/public';
	import { page } from '$app/state';
	import type { CurrentUser } from '$lib/state/currentUser.svelte';
	import AccountRow from './AccountRow.svelte';

	/** What the identity provider knows about the signed-in person, with links to change it. */
	interface Props {
		user: CurrentUser;
	}

	let { user }: Props = $props();

	// Logto Account Center deep-link support
	const accountCenterUrl =
		configPublic.PUBLIC_OIDC_ACCOUNT_URL ??
		configPublic.PUBLIC_OIDC_AUTHORITY.replace(/\/oidc\/?$/, '') + '/account';

	function accountUrl(path: string) {
		const back = `${page.url.origin}/my-account`;
		return `${accountCenterUrl}/${path}?redirect=${encodeURIComponent(back)}`;
	}

	const mfaFactors = $derived(user.mfaVerificationFactors ?? []);
	const hasPasskey = $derived(mfaFactors.includes('WebAuthn'));
	const hasTotp = $derived(mfaFactors.includes('Totp'));
	const hasBackupCodes = $derived(mfaFactors.includes('BackupCode'));

	/**
	 * The second factors, each shown with a check once set up. Backup codes only matter once
	 * there is a passkey or an authenticator app.
	 */
	const factorRows = $derived(
		[
			{
				icon: 'fingerprint',
				label: m.passkeys(),
				isSet: hasPasskey,
				editHref: accountUrl(hasPasskey ? 'passkey/manage' : 'passkey/add'),
				editLabel: hasPasskey ? 'Manage passkeys' : 'Add passkey'
			},
			{
				icon: 'shield-keyhole',
				label: m.authenticatorApp(),
				isSet: hasTotp,
				editHref: accountUrl(hasTotp ? 'authenticator-app/replace' : 'authenticator-app'),
				editLabel: hasTotp ? 'Replace authenticator app' : 'Set up authenticator app'
			},
			{
				icon: 'file-shield',
				label: m.backupCodes(),
				isSet: hasBackupCodes,
				editHref: accountUrl(hasBackupCodes ? 'backup-codes/manage' : 'backup-codes/generate'),
				editLabel: hasBackupCodes ? 'Manage backup codes' : 'Generate backup codes',
				hidden: !hasPasskey && !hasTotp
			}
		].filter((row) => !row.hidden)
	);
	const hasLinkedIdentities = $derived(
		!!(user.ssoIdentities?.length || user.socialIdentities?.length)
	);
</script>

<div class="card bg-base-100 border-base-200 border shadow-xl">
	<div class="card-body">
		<h2 class="card-title justify-center">
			<i class="fa-sharp-duotone fa-solid fa-shield-halved text-primary"></i>
			{m.loginInformation()}
		</h2>
		<div class="divide-base-200 divide-y">
			<AccountRow
				icon="user"
				label={m.loginName()}
				editHref={accountUrl('username')}
				editLabel="Change username"
			>
				<div class="truncate">{user.preferred_username ?? '–'}</div>
			</AccountRow>
			<AccountRow
				icon="envelope"
				label={m.email()}
				editHref={accountUrl('email')}
				editLabel="Change email"
			>
				<div class="truncate">{user.email}</div>
			</AccountRow>
			<AccountRow
				icon="key"
				label={m.password()}
				editHref={accountUrl('password')}
				editLabel="Change password"
			>
				{#if user.hasPassword}
					<div>•••••</div>
				{/if}
			</AccountRow>
			{#each factorRows as row (row.icon)}
				<AccountRow
					icon={row.icon}
					label={row.label}
					editHref={row.editHref}
					editLabel={row.editLabel}
				>
					{#if row.isSet}
						<div class="text-success text-sm">
							<i class="fa-sharp-duotone fa-solid fa-check"></i>
						</div>
					{/if}
				</AccountRow>
			{/each}
			{#if hasLinkedIdentities}
				<AccountRow icon="link" label={m.ssoIdentities()}>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each user.socialIdentities ?? [] as provider (provider)}
							<span class="badge badge-sm capitalize">{provider}</span>
						{/each}
						{#each user.ssoIdentities ?? [] as sso (`${sso.issuer}:${sso.identityId}`)}
							<span class="badge badge-sm">{sso.issuer}</span>
						{/each}
					</div>
				</AccountRow>
			{/if}
			<AccountRow icon="binary" label={m.userId()}>
				<div class="truncate font-mono text-sm">{user.sub}</div>
			</AccountRow>
			{#if user.myOIDCRoles.length}
				<AccountRow icon="user-lock" label={m.rights()}>
					<div>{user.myOIDCRoles.map((x) => x.toUpperCase()).join(', ')}</div>
				</AccountRow>
			{/if}
		</div>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
		<p class="mt-4 text-center text-sm">{@html m.deleteAccountGPDR()}</p>
	</div>
</div>
