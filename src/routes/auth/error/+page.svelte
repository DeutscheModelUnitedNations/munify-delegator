<script lang="ts">
	import accessDenied from '$assets/undraw/access_denied.svg';
	import svg500 from '$assets/undraw/500.svg';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { configPublic } from '$config/public';

	// Known OIDC error codes, plus the internal ones the app raises itself. Anything else is
	// reported as unknown rather than echoed back into the page.
	const ERROR_TYPES = [
		'access_denied',
		'login_required',
		'consent_required',
		'invalid_request',
		'server_error',
		'temporarily_unavailable',
		'token_exchange_failed',
		'state_mismatch',
		'network_error'
	] as const;

	type ErrorType = (typeof ERROR_TYPES)[number] | 'unknown';

	function isKnownErrorType(value: string | null): value is (typeof ERROR_TYPES)[number] {
		return value !== null && ERROR_TYPES.some((type) => type === value);
	}

	const rawErrorType = $derived(page.url.searchParams.get('type'));
	const errorType: ErrorType = $derived(isKnownErrorType(rawErrorType) ? rawErrorType : 'unknown');
	const errorDescription = $derived(page.url.searchParams.get('description'));
	const supportEmail = configPublic.PUBLIC_SUPPORT_EMAIL;

	// Determine which illustration to show based on error type
	const illustration = $derived(
		['access_denied', 'consent_required', 'login_required'].includes(errorType)
			? accessDenied
			: svg500
	);

	// Get the appropriate title based on error type
	function getTitle(): string {
		switch (errorType) {
			case 'access_denied':
				return m.authErrorAccessDeniedTitle();
			case 'login_required':
			case 'consent_required':
				return m.authErrorLoginRequiredTitle();
			case 'server_error':
			case 'temporarily_unavailable':
				return m.authErrorProviderUnavailableTitle();
			case 'token_exchange_failed':
			case 'state_mismatch':
			case 'network_error':
				return m.authErrorTechnicalTitle();
			default:
				return m.authErrorGenericTitle();
		}
	}

	// Get the appropriate description based on error type
	function getDescription(): string {
		switch (errorType) {
			case 'access_denied':
				return m.authErrorAccessDeniedDescription();
			case 'login_required':
			case 'consent_required':
				return m.authErrorLoginRequiredDescription();
			case 'server_error':
			case 'temporarily_unavailable':
				return m.authErrorProviderUnavailableDescription();
			case 'token_exchange_failed':
				return m.authErrorTokenExchangeDescription();
			case 'state_mismatch':
				return m.authErrorStateMismatchDescription();
			case 'network_error':
				return m.authErrorNetworkDescription();
			default:
				return m.authErrorGenericDescription();
		}
	}

	const mailtoLink = $derived.by(() => {
		const subject = encodeURIComponent(`Auth Error - ${errorType}`);
		const body = encodeURIComponent(
			`Error Type: ${errorType}\nDescription: ${errorDescription ?? 'N/A'}\n\nPlease describe what you were trying to do:\n`
		);
		return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
	});
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-8 p-4 py-12">
	<img src={illustration} alt="Authentication Error" class="w-1/3 max-w-[180px]" />

	<h1 class="text-center text-3xl font-bold">{getTitle()}</h1>

	<p class="text-center text-base-content/80">
		{getDescription()}
	</p>

	{#if errorDescription}
		<div class="rounded-box w-full bg-base-200 p-4">
			<p class="text-sm text-base-content/70">
				<span class="font-medium">{m.authErrorDetails()}:</span>
				{errorDescription}
			</p>
		</div>
	{/if}

	<div class="flex flex-col gap-3 sm:flex-row">
		<a class="btn btn-primary" href="/">
			<i class="fa-duotone fa-arrow-right"></i>
			{m.authErrorTryAgain()}
		</a>
		<a class="btn btn-ghost" href={mailtoLink}>
			<i class="fa-duotone fa-envelope"></i>
			{m.authErrorContactSupport()}
		</a>
	</div>

	<p class="text-center text-sm text-base-content/50">
		{m.authErrorSupportEmail()}:
		<a href="mailto:{supportEmail}" class="link">{supportEmail}</a>
	</p>
</main>
