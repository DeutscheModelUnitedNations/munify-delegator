<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const canReceiveMail = $derived(
		data.conferenceQueryData?.findUniqueUser?.canReceiveDelegationMail ?? false
	);

	let submitting = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
</script>

<div class="flex flex-col gap-6">
	<!-- Hero Section with Animated Background -->
	<section class="relative overflow-hidden rounded-box bg-base-200 p-8">
		<!-- Animated Background Blobs -->
		<div
			class="floating-blob pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-r from-violet-400/30 to-purple-400/30 blur-3xl"
			style="animation-delay: 0s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-400/30 blur-3xl"
			style="animation-delay: 5s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-gradient-to-r from-pink-400/20 to-rose-400/20 blur-3xl"
			style="animation-delay: 10s;"
			aria-hidden="true"
		></div>

		<div class="relative z-10 text-center">
			<h1 class="text-4xl font-bold mb-3">{m.messagingCenter()}</h1>
			<p class="max-w-2xl mx-auto text-base-content/70 mb-6">
				{m.messagingDescription()}
			</p>
			<a href={`${basePath}/compose`} class="btn btn-primary btn-lg">
				<i class="fa-solid fa-paper-plane"></i>
				{m.messagingNewMessage()}
			</a>
		</div>
	</section>

	<!-- About Section -->
	<DashboardSection
		icon="circle-info"
		title={m.messagingAboutTitle()}
		description={m.messagingAboutDescription()}
	>
		<div class="flex flex-col gap-4">
			<ul class="flex flex-col gap-3">
				<li class="flex items-start gap-3">
					<i class="fa-duotone fa-fw fa-envelope text-primary mt-0.5"></i>
					<span class="text-base-content/80">{m.messagingAboutRecipientNotice()}</span>
				</li>
				<li class="flex items-start gap-3">
					<i class="fa-duotone fa-fw fa-eye-slash text-primary mt-0.5"></i>
					<span class="text-base-content/80">{m.messagingAboutPrivacy()}</span>
				</li>
				<li class="flex items-start gap-3">
					<i class="fa-duotone fa-fw fa-reply-all text-primary mt-0.5"></i>
					<span class="text-base-content/80">{m.messagingAboutThreading()}</span>
				</li>
				<li class="flex items-start gap-3">
					<i class="fa-duotone fa-fw fa-layer-group text-primary mt-0.5"></i>
					<span class="text-base-content/80">{m.messagingAboutGrouped()}</span>
				</li>
				<li class="flex items-start gap-3">
					<i class="fa-duotone fa-fw fa-clipboard-check text-primary mt-0.5"></i>
					<span class="text-base-content/80">{m.messagingAboutDeliveryLog()}</span>
				</li>
			</ul>
			<form
				class="w-full"
				bind:this={formEl}
				method="POST"
				action="?/toggleMessaging"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						await invalidateAll();
						submitting = false;
					};
				}}
			>
				<input type="hidden" name="enabled" value={String(!canReceiveMail)} />
				<div role="alert" class="alert {canReceiveMail ? 'alert-success' : 'alert-warning'}">
					<i class="fa-solid {canReceiveMail ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg"
					></i>
					<span class="flex-1"
						>{canReceiveMail ? m.messagingToggleEnabled() : m.messagingToggleDisabled()}</span
					>
					<input
						type="checkbox"
						class="toggle {canReceiveMail ? 'toggle-success' : ''}"
						class:opacity-50={submitting}
						checked={canReceiveMail}
						disabled={submitting}
						aria-label={canReceiveMail ? m.messagingToggleEnabled() : m.messagingToggleDisabled()}
						onchange={() => formEl?.requestSubmit()}
					/>
				</div>
			</form>
		</div>
	</DashboardSection>

	<!-- Guidelines Section -->
	<DashboardSection
		icon="scale-balanced"
		title={m.messagingGuidelines()}
		description={m.messagingGuidelinesDescription()}
	>
		<ul class="flex flex-col gap-3">
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-handshake text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineRespectful()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-landmark text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineDiplomaticCode()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-ban text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineNoSpam()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-bullseye text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineConcise()}</span>
			</li>
		</ul>
	</DashboardSection>

	<!-- Data Notice -->
	<div role="alert" class="alert alert-warning">
		<i class="fa-solid fa-shield-halved text-lg"></i>
		<span>{m.messagingDataNotice()}</span>
	</div>

	<!-- Quick Link -->
	<div class="text-center">
		<a href={`${basePath}/history`} class="btn btn-ghost">
			<i class="fa-duotone fa-clock-rotate-left"></i>
			{m.messagingViewSentHistory()}
		</a>
	</div>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -20px) scale(1.05);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.95);
		}
	}

	.floating-blob {
		animation: float 20s ease-in-out infinite;
	}
</style>
