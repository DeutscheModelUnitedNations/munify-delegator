<script lang="ts">
	import accessDenied from '$assets/undraw/access_denied.svg';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { configPublic } from '$config/public';

	function isValidScenario(value: string | null): value is 'new' | 'change' {
		return value === 'new' || value === 'change';
	}

	/**
	 * The addresses arrive already masked, but they still come out of the query string, so keep them
	 * to the characters a masked address can contain rather than rendering them as given.
	 */
	function sanitizeMaskedEmail(email: string | null): string {
		if (!email) return '***@***';
		const sanitized = email.replace(/[^a-zA-Z0-9@.\-_*]/g, '');
		if (!sanitized.includes('@') || sanitized.length > 100) return '***@***';
		return sanitized;
	}

	function sanitizeRefId(ref: string | null): string {
		if (!ref) return 'unknown';
		const sanitized = ref.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
		return sanitized.length > 0 ? sanitized : 'unknown';
	}

	const params = $derived(page.url.searchParams);
	const scenarioParam = $derived(params.get('scenario'));
	const scenario = $derived(isValidScenario(scenarioParam) ? scenarioParam : 'new');
	const maskedEmail = $derived(sanitizeMaskedEmail(params.get('email')));
	const referenceId = $derived(sanitizeRefId(params.get('ref')));
	const existingEmailParam = $derived(params.get('existingEmail'));
	const maskedExistingEmail = $derived(
		existingEmailParam ? sanitizeMaskedEmail(existingEmailParam) : null
	);
	const supportEmail = configPublic.PUBLIC_SUPPORT_EMAIL;

	const mailtoQuery = $derived.by(() => {
		const subject = encodeURIComponent(`Email Conflict - Ref: ${referenceId}`);
		const body = encodeURIComponent(
			`Reference ID: ${referenceId}\nScenario: ${scenario === 'new' ? 'New user registration' : 'Email change'}\nConflicting email: ${maskedEmail}\n\nPlease describe your issue:\n`
		);
		return `subject=${subject}&body=${body}`;
	});
</script>

<main class="mx-auto flex max-w-[700px] flex-col items-center justify-center gap-8 p-4 py-12">
	<img src={accessDenied} alt="Email Conflict" class="w-1/3 max-w-[200px]" />

	<h1 class="text-center text-3xl font-bold">{m.emailConflictTitle()}</h1>

	{#if scenario === 'new'}
		<p class="text-center">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/; the interpolated address is reduced by sanitizeMaskedEmail to [a-zA-Z0-9@._*-], which cannot form markup -->
			{@html m.emailConflictNewUserDescription({ email: maskedEmail })}
		</p>
	{:else}
		<p class="text-center">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/; the interpolated address is reduced by sanitizeMaskedEmail to [a-zA-Z0-9@._*-], which cannot form markup -->
			{@html m.emailConflictEmailChangeDescription({ email: maskedEmail })}
		</p>
	{/if}

	<div class="flex w-full flex-col gap-4">
		<h2 class="text-xl font-semibold">{m.emailConflictHowToResolve()}</h2>

		<div class="rounded-box bg-base-200 p-4">
			<div class="flex items-start gap-3">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
				>
					1
				</div>
				<div>
					<h3 class="font-semibold">{m.emailConflictOption1Title()}</h3>
					<p class="text-base-content/70">{m.emailConflictOption1Description()}</p>
				</div>
			</div>
		</div>

		<div class="rounded-box bg-base-200 p-4">
			<div class="flex items-start gap-3">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
				>
					2
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold">{m.emailConflictOption2Title()}</h3>
					<p class="text-base-content/70">{m.emailConflictOption2Description()}</p>
					<div class="flex flex-wrap items-center gap-3">
						<a href={`mailto:${supportEmail}?${mailtoQuery}`} class="btn btn-primary btn-sm">
							<i class="fa-duotone fa-envelope"></i>
							{m.emailConflictContactSupport()}
						</a>
						<span class="text-base-content/70">
							<a href="mailto:{supportEmail}" class="link">{supportEmail}</a>
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if scenario === 'change' && maskedExistingEmail}
		<div class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation text-2xl"></i>
			<p>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/; the interpolated address is reduced by sanitizeMaskedEmail to [a-zA-Z0-9@._*-], which cannot form markup -->
				{@html m.emailConflictWarning({ existingEmail: maskedExistingEmail })}
			</p>
		</div>
	{/if}

	<div class="rounded-box flex items-center gap-2 bg-base-300 px-4 py-2 text-sm">
		<span class="font-medium">{m.emailConflictReferenceId()}:</span>
		<code class="font-mono">{referenceId}</code>
	</div>

	<a class="btn" href={resolve('/')}>{m.backToHome()}</a>
</main>
