<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	/**
	 * The pages of the conference's committees and agenda items, which fill the sidebar's
	 * committee template. A missing one is created when opened.
	 */
	interface Props {
		conferenceId: string;
		editorHref: (pageId: string) => string;
	}

	let { conferenceId, editorHref }: Props = $props();

	const [committees, pages] = $derived(
		await Promise.all([
			client.liveQuery.committees({
				__args: { where: { conferenceId: { eq: conferenceId } }, orderBy: { createdAt: 'asc' } },
				name: true,
				abbreviation: true,
				agendaItems: { title: true, createdAt: true }
			}),
			client.liveQuery.guideLibrary({
				__args: { conferenceId },
				committeeId: true,
				agendaItemId: true,
				publishedVersionId: true
			})
		])
	);

	const byCommittee = $derived(new Map(pages.map((page) => [page.committeeId, page])));
	const byAgendaItem = $derived(new Map(pages.map((page) => [page.agendaItemId, page])));

	async function open(owner: { committeeId: string } | { agendaItemId: string }) {
		const promise = client.mutate.ensureGuidePageOf({ __args: owner, title: true });
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		const page = await promise;
		await goto(editorHref(page.id));
	}
</script>

{#snippet pageButton(
	page: { id: string; publishedVersionId?: string | null } | undefined,
	owner: { committeeId: string } | { agendaItemId: string }
)}
	{#if page}
		<a class="btn btn-xs btn-ghost" href={editorHref(page.id)}>
			<i
				class="ph-duotone {page.publishedVersionId
					? 'ph-check-circle text-success'
					: 'ph-pencil-simple'}"
				aria-hidden="true"
			></i>
			{page.publishedVersionId ? m.guideStatePublished() : m.guideStateDraft()}
		</a>
	{:else}
		<button class="btn btn-xs btn-outline" onclick={() => open(owner)}>
			<i class="ph-duotone ph-plus" aria-hidden="true"></i>
			{m.guideCreateOwnedPage()}
		</button>
	{/if}
{/snippet}

<section
	class="flex flex-col gap-3"
	data-tour="team.guide.committees"
	aria-labelledby="guide-committee-pages"
>
	<h2 id="guide-committee-pages" class="text-lg font-semibold">{m.guideCommitteePages()}</h2>
	<p class="text-sm opacity-70">{m.guideCommitteePagesHint()}</p>
	{#if committees.length === 0}
		<div class="alert" role="status">{m.guideNoCommittees()}</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each committees as committee (committee.id)}
				<li class="rounded-box border-base-300 flex flex-col gap-2 border p-3">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium">{committee.abbreviation} · {committee.name}</span>
						<span class="ml-auto"
							>{@render pageButton(byCommittee.get(committee.id), {
								committeeId: committee.id
							})}</span
						>
					</div>
					{#if committee.agendaItems.length > 0}
						<ul class="flex flex-col gap-1 ps-4">
							{#each committee.agendaItems.toSorted((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) as item (item.id)}
								<li class="flex flex-wrap items-center gap-2 text-sm">
									<i class="ph-duotone ph-chat-centered-text" aria-hidden="true"></i>
									<span class="min-w-0 flex-1">{item.title}</span>
									{@render pageButton(byAgendaItem.get(item.id), { agendaItemId: item.id })}
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
