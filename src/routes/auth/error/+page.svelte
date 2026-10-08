<script lang="ts">
	import accessDenied from '$assets/undraw/access_denied.svg';
	import svg500 from '$assets/undraw/500.svg';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { configPublic } from '$config/public';
	import {
		authErrorDescription,
		authErrorTitle,
		isAccessError,
		parseAuthErrorType
	} from './authErrors';

	const errorType = $derived(parseAuthErrorType(page.url.searchParams.get('type')));
	const errorDescription = $derived(page.url.searchParams.get('description'));
	const supportEmail = configPublic.PUBLIC_SUPPORT_EMAIL;

	// Determine which illustration to show based on error type
	const illustration = $derived(isAccessError(errorType) ? accessDenied : svg500);

	const mailtoQuery = $derived.by(() => {
		const subject = encodeURIComponent(`Auth Error - ${errorType}`);
		const body = encodeURIComponent(
			`Error Type: ${errorType}\nDescription: ${errorDescription ?? 'N/A'}\n\nPlease describe what you were trying to do:\n`
		);
		return `subject=${subject}&body=${body}`;
	});
</script>

<main class="mx-auto flex max-w-[600px] flex-col items-center justify-center gap-8 p-4 py-12">
	<img src={illustration} alt="Authentication Error" class="w-1/3 max-w-[180px]" />

	<h1 class="text-center text-3xl font-bold">{authErrorTitle(errorType)}</h1>

	<p class="text-center text-base-content/80">
		{authErrorDescription(errorType)}
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
		<a class="btn btn-primary" href={resolve('/')}>
			<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
			{m.authErrorTryAgain()}
		</a>
		<a class="btn btn-ghost" href={`mailto:${supportEmail}?${mailtoQuery}`}>
			<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
			{m.authErrorContactSupport()}
		</a>
	</div>

	<p class="text-center text-sm text-base-content/50">
		{m.authErrorSupportEmail()}:
		<a href="mailto:{supportEmail}" class="link">{supportEmail}</a>
	</p>
</main>
