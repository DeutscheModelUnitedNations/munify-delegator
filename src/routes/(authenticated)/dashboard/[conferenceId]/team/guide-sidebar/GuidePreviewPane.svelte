<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuideReader from '#lib/components/guide/GuideReader.svelte';
	import { previewArgsOf } from '#lib/guide/preview';

	/**
	 * The guide as a reader sees it: one audience (a committee's delegates, NSAs, a custom role,
	 * supervisors) of the draft or of what is published.
	 */
	interface Props {
		conferenceId: string;
		committees: readonly { id: string; name: string }[];
		roles: readonly { id: string; name: string }[];
	}

	let { conferenceId, committees, roles }: Props = $props();

	let audience = $state<string>('EVERYTHING');
	let draft = $state(true);
	let pageId = $state<string | undefined>(undefined);
	let entryKey = $state<string | null>(null);

	const preview = $derived(previewArgsOf({ choice: audience, draft }));

	const PREVIEW_PREFIX = '#guide-preview:';
	const hrefOf = ({ pageId: id, key }: { pageId: string; key?: string }) =>
		`${PREVIEW_PREFIX}${id}${key ? `:${key}` : ''}`;

	/** The preview keeps its own place: its links only say which entry to open. */
	function follow(event: MouseEvent) {
		const link = event.target instanceof Element ? event.target.closest('a') : null;
		const href = link?.getAttribute('href');
		if (!href?.startsWith(PREVIEW_PREFIX)) return;
		event.preventDefault();
		const [id, ...key] = href.slice(PREVIEW_PREFIX.length).split(':');
		pageId = id;
		entryKey = key.length > 0 ? key.join(':') : null;
	}
</script>

<section
	class="rounded-box border-base-300 flex flex-col gap-3 border p-3"
	data-tour="team.guideSidebar.preview"
	aria-label={m.guidePreview()}
>
	<div class="flex flex-wrap items-center gap-2">
		<select
			class="select select-sm"
			aria-label={m.guidePreviewAs()}
			bind:value={audience}
			onchange={() => (pageId = undefined)}
		>
			<option value="EVERYTHING">{m.guidePreviewEverything()}</option>
			{#each committees as committee (committee.id)}
				<option value="DELEGATE:{committee.id}"
					>{m.guidePreviewDelegateOf({ committee: committee.name })}</option
				>
			{/each}
			<option value="NON_STATE_ACTOR">{m.guideAudienceNonStateActors()}</option>
			{#each roles as role (role.id)}
				<option value="CUSTOM_ROLE:{role.id}">{role.name}</option>
			{/each}
			<option value="SUPERVISOR">{m.guideAudienceSupervisors()}</option>
		</select>
		<label class="label cursor-pointer gap-2 text-sm">
			<input type="checkbox" class="toggle toggle-sm" bind:checked={draft} />
			{m.guidePreviewDrafts()}
		</label>
	</div>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions: links inside handle the keyboard -->
	<div onclick={follow}>
		<GuideReader {conferenceId} {pageId} {entryKey} {hrefOf} {preview} />
	</div>
</section>
