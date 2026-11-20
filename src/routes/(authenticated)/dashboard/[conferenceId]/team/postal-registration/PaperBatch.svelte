<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import formatNames from '#lib/helpers/formatNames';
	import Modal from '#lib/components/Modal.svelte';
	import { changesAnything, proposePaperChange } from '#lib/paperScan/proposal';
	import { pagesByPerson, strayPages, type PersonResult, type ScannedPage } from './paperBatch';
	import { pagesOf, readScannedPage } from './scanFiles';
	import { postalStatusOf } from './postalConfirm';
	import PaperBatchPerson from './PaperBatchPerson.svelte';

	/**
	 * Reads a batch of scanned application documents and saves what they say, unattended: every
	 * page's code names its person and its fields, a signed document is marked in, a media choice
	 * taken where none was stored (`proposePaperChange`). Nothing is set back; what could not be
	 * told is listed for a person to check, with the pages nobody could be found for. Nothing of
	 * the scans is kept: they are read in the browser.
	 */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let open = $state(false);
	let dragging = $state(false);
	let running = $state(false);
	let progress = $state({ files: 0, pages: 0 });
	let pages = $state<ScannedPage[]>([]);
	let people = $state<PersonResult[]>([]);
	const stray = $derived(strayPages(pages));

	const acceptance = $derived({
		conferenceId,
		kinds: ['print'] as const,
		printedNametags: false
	});

	const fullName = (user: { givenName?: string | null; familyName?: string | null }) =>
		formatNames({
			givenName: user.givenName ?? undefined,
			familyName: user.familyName ?? undefined
		});

	/** The people's status rows, with their names, to propose and save against. */
	async function statusRows(userIds: string[]) {
		if (userIds.length === 0) return [];
		return client.query.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { in: userIds } } },
			userId: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true,
			user: { givenName: true, familyName: true }
		});
	}

	/** Saves what a person's pages say; answers the person's line of the report. */
	// fallow-ignore-next-line complexity
	async function settle({
		person,
		row
	}: {
		person: ReturnType<typeof pagesByPerson>[number];
		row: Awaited<ReturnType<typeof statusRows>>[number] | undefined;
	}): Promise<PersonResult> {
		const proposal = proposePaperChange({
			readings: person.readings,
			status: postalStatusOf(row),
			confirm: false
		});
		const result = {
			userId: person.userId,
			name: row ? fullName(row.user) : person.userId,
			pages: person.pages,
			unreadable: person.unreadable,
			...proposal,
			missing: !row
		};
		if (!row || !changesAnything(proposal.change)) return result;
		try {
			await client.mutate.upsertConferenceParticipant({
				__args: { ...proposal.change, id: row.id, conferenceId, userId: person.userId },
				id: true
			});
			return result;
		} catch (error) {
			logger.warn('Saving what a scan says failed', error);
			return {
				...result,
				change: {},
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	// fallow-ignore-next-line complexity
	async function run(files: File[]) {
		if (running || files.length === 0) return;
		running = true;
		pages = [];
		people = [];
		progress = { files: 0, pages: 0 };
		try {
			for (const file of files) {
				try {
					for await (const { page, picture } of pagesOf(file)) {
						const outcome = await readScannedPage({ picture, acceptance });
						pages.push({ file: file.name, page, outcome });
						progress.pages += 1;
					}
				} catch (error) {
					logger.warn('Reading a scanned file failed', error);
					pages.push({
						file: file.name,
						page: 0,
						outcome: { kind: 'refused', message: m.paperFileUnreadable() }
					});
				}
				progress.files += 1;
			}
			const found = pagesByPerson(pages);
			const rows = await statusRows(found.map(({ userId }) => userId));
			for (const person of found) {
				const row = rows.find((candidate) => candidate.userId === person.userId);
				people.push(await settle({ person, row }));
			}
		} finally {
			running = false;
		}
	}

	function onfiles(list: FileList | null | undefined) {
		if (list) void run([...list]);
	}

	function ondrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		onfiles(event.dataTransfer?.files);
	}

	const strayReason = (page: ScannedPage) =>
		page.outcome.kind === 'refused' ? page.outcome.message : m.paperPageWithoutCode();
</script>

<button type="button" class="btn btn-sm" onclick={() => (open = true)}>
	<i aria-hidden="true" class="ph-duotone ph-files"></i>
	{m.paperBatchOpen()}
</button>

<Modal bind:open title={m.paperBatchTitle()} fullWidth>
	<div class="flex w-4xl max-w-full flex-col gap-4">
		<p class="text-base-content/70 text-sm">{m.paperBatchHint()}</p>

		<label
			class="border-base-300 hover:border-primary flex cursor-pointer flex-col items-center gap-2 rounded-box border-2 border-dashed p-8 text-center {dragging
				? 'border-primary bg-primary/5'
				: ''}"
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			{ondrop}
		>
			<i aria-hidden="true" class="ph-duotone ph-upload-simple text-4xl"></i>
			<span>{m.paperBatchDrop()}</span>
			<input
				type="file"
				class="sr-only"
				multiple
				accept="application/pdf,image/*"
				disabled={running}
				onchange={(event) => onfiles(event.currentTarget.files)}
			/>
		</label>

		{#if running}
			<div class="flex items-center gap-3" role="status">
				<span class="loading loading-spinner loading-sm"></span>
				{m.paperBatchProgress({ files: progress.files, pages: progress.pages })}
			</div>
		{/if}

		{#if people.length > 0}
			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">{m.paperBatchPeople({ count: people.length })}</h3>
				<ul class="divide-base-300 flex flex-col divide-y">
					{#each people as person (person.userId)}
						<PaperBatchPerson {person} />
					{/each}
				</ul>
			</section>
		{/if}

		{#if stray.length > 0}
			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">{m.paperBatchStray({ count: stray.length })}</h3>
				<ul class="text-sm">
					{#each stray as page, index (index)}
						<li>
							{page.file}{page.page > 0 ? `, ${m.paperBatchPage({ page: page.page })}` : ''}: {strayReason(
								page
							)}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</Modal>
