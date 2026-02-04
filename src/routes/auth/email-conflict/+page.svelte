<script lang="ts">
	import accessDenied from '$assets/undraw/access_denied.svg';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		data: {
			scenario: 'new' | 'change';
			maskedEmail: string;
			referenceId: string;
			maskedExistingEmail: string | null;
			supportEmail: string;
		};
	}

	let { data }: Props = $props();

	const mailtoSubject = encodeURIComponent(`Email Conflict - Ref: ${data.referenceId}`);
	const mailtoBody = encodeURIComponent(
		`Reference ID: ${data.referenceId}\nScenario: ${data.scenario === 'new' ? 'New user registration' : 'Email change'}\nConflicting email: ${data.maskedEmail}\n\nPlease describe your issue:\n`
	);
	const mailtoLink = `mailto:${data.supportEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;
</script>

<main class="mx-auto flex max-w-[700px] flex-col items-center justify-center gap-8 p-4 py-12">
	<img src={accessDenied} alt="Email Conflict" class="w-1/3 max-w-[200px]" />

	<h1 class="text-center text-3xl font-bold">{m.emailConflictTitle()}</h1>

	{#if data.scenario === 'new'}
		<p class="text-center">
			{@html m.emailConflictNewUserDescription({ email: data.maskedEmail })}
		</p>
	{:else}
		<p class="text-center">
			{@html m.emailConflictEmailChangeDescription({ email: data.maskedEmail })}
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
						<a href={mailtoLink} class="btn btn-primary btn-sm">
							<i class="fa-duotone fa-envelope"></i>
							{m.emailConflictContactSupport()}
						</a>
						<span class="text-base-content/70">
							<a href="mailto:{data.supportEmail}" class="link">{data.supportEmail}</a>
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if data.scenario === 'change' && data.maskedExistingEmail}
		<div class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation text-2xl"></i>
			<p>
				{@html m.emailConflictWarning({ existingEmail: data.maskedExistingEmail })}
			</p>
		</div>
	{/if}

	<div class="rounded-box flex items-center gap-2 bg-base-300 px-4 py-2 text-sm">
		<span class="font-medium">{m.emailConflictReferenceId()}:</span>
		<code class="font-mono">{data.referenceId}</code>
	</div>

	<a class="btn" href="/">{m.backToHome()}</a>
</main>
