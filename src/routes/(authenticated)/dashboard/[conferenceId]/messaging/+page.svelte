<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	$: conferenceId = $page.params.conferenceId;
	$: basePath = `/dashboard/${conferenceId}/messaging`;
	$: pathname = $page.url.pathname;
</script>

<section class="relative overflow-hidden rounded-box bg-base-200/70 p-6 shadow-sm">
	<div
		class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(252,165,165,0.45),rgba(252,165,165,0))]"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.45),rgba(56,189,248,0))]"
		aria-hidden="true"
	></div>

	<div class="relative z-10 flex flex-col gap-6">
		<div class="flex flex-col gap-3">
			<p class="text-xs uppercase tracking-[0.2em] text-base-content/60">
				{m.messagingConferenceMessaging()}
			</p>
			<h1 class="text-3xl font-semibold sm:text-4xl">{m.messagingCenter()}</h1>
			<p class="max-w-2xl text-base-content/70">
				{m.messagingDescription()}
			</p>
		</div>

		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<nav class="tabs tabs-boxed bg-base-100/70 p-1">
				<a
					class="tab {pathname === basePath ? 'tab-active' : ''}"
					href={basePath}
					aria-current={pathname === basePath ? 'page' : undefined}
				>
					{m.messagingOverview()}
				</a>
				<a
					class="tab {pathname.startsWith(`${basePath}/compose`) ? 'tab-active' : ''}"
					href={`${basePath}/compose`}
					aria-current={pathname.startsWith(`${basePath}/compose`) ? 'page' : undefined}
				>
					{m.messageCompose()}
				</a>
				<a
					class="tab {pathname.startsWith(`${basePath}/history`) ? 'tab-active' : ''}"
					href={`${basePath}/history`}
					aria-current={pathname.startsWith(`${basePath}/history`) ? 'page' : undefined}
				>
					{m.messageHistory()}
				</a>
			</nav>

			<div class="flex flex-wrap gap-2">
				<a href={`${basePath}/compose`} class="btn btn-primary">
					<i class="fa-solid fa-paper-plane"></i>
					{m.messagingNewMessage()}
				</a>
				<a href={`${basePath}/history`} class="btn btn-outline">
					<i class="fa-solid fa-clock-rotate-left"></i>
					{m.messageSentLog()}
				</a>
			</div>
		</div>
	</div>
</section>

<div class="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
	<section class="card bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title">{m.messagingQuickActions()}</h2>
			<p class="text-base-content/70">
				{m.messagingStartTargetedMessage()}
			</p>
			<div class="grid gap-3 sm:grid-cols-2">
				<a href={`${basePath}/compose`} class="card border border-base-200 hover:bg-base-200/60">
					<div class="card-body">
						<div class="flex items-center gap-3">
							<span class="rounded-full bg-primary/10 p-3 text-primary">
								<i class="fa-solid fa-pen-nib"></i>
							</span>
							<div>
								<h3 class="font-semibold">{m.messageComposeAnnouncement()}</h3>
								<p class="text-sm text-base-content/60">{m.messageDraftAMessage()}</p>
							</div>
						</div>
					</div>
				</a>
				<a href={`${basePath}/history`} class="card border border-base-200 hover:bg-base-200/60">
					<div class="card-body">
						<div class="flex items-center gap-3">
							<span class="rounded-full bg-secondary/10 p-3 text-secondary">
								<i class="fa-solid fa-inbox"></i>
							</span>
							<div>
								<h3 class="font-semibold">{m.messageReviewSent()}</h3>
								<p class="text-sm text-base-content/60">{m.messagingCheckDeliveryStatus()}</p>
							</div>
						</div>
					</div>
				</a>
			</div>
		</div>
	</section>

	<aside class="card bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title">{m.messagingGuidelines()}</h2>
			<ul class="space-y-2 text-sm text-base-content/70">
				<li>{m.messagingGuidelineShort()}</li>
				<li>{m.messagingGuidelineDeadlines()}</li>
				<li>{m.messagingGuidelineOptIn()}</li>
			</ul>
			<div class="divider"></div>
			<div class="flex items-center gap-2 text-xs text-base-content/60">
				<i class="fa-solid fa-shield-halved"></i>
				{m.messagingLogsStored()}
			</div>
		</div>
	</aside>
</div>
