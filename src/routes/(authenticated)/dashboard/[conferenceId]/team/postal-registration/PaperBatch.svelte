<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import LoadBoundary from '#lib/components/LoadBoundary.svelte';
	import { browserPlatform, checkCode } from '#lib/components/postal/browserScan';
	import { keepScan } from '#lib/components/postal/uploadScan';
	import { readPages } from '#lib/paperScan/intake/pages';
	import {
		describeScanProblem,
		type ScanProblem,
		type ScanProblemReason
	} from '#lib/paperScan/intake/people';
	import { takeScan, type KeepArgs, type KeptPage } from '#lib/paperScan/intake/takeScan';
	import { personReport, withResult, type PersonResult } from './paperBatch';
	import FolderWatch from './FolderWatch.svelte';
	import PaperBatchPerson from './PaperBatchPerson.svelte';
	import ScannerSetup from './ScannerSetup.svelte';

	/**
	 * Takes in a batch of scanned application documents, unattended (`takeScan`): every page's code
	 * names its person and its fields, each page becomes a scan of theirs, a signed document
	 * is marked in, a media choice taken where none was stored (`proposePaperChange`). Nothing is set
	 * back; what could not be told is listed for a person to check, with the pages nobody could be
	 * found for, of which nothing is kept.
	 */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let dragging = $state(false);
	let running = $state(false);
	let setupOpen = $state(false);
	let progress = $state({ files: 0, pages: 0 });
	let problems = $state<ScanProblem[]>([]);
	let people = $state<PersonResult[]>([]);

	type Source = 'UPLOAD' | 'FOLDER';

	/** Said on the person's own line: unreadable fields, and who is not registered. */
	const ON_PERSONS_LINE: readonly ScanProblemReason[] = ['unreadable', 'notRegistered'];

	/** The people's status rows, with their names, to propose against, by user. */
	async function participants(userIds: string[]) {
		if (userIds.length === 0) return new Map<string, never>();
		const rows = await client.query.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { in: userIds } } },
			userId: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true,
			agreementDetails: { field: true, state: true, source: true },
			user: { givenName: true, familyName: true, birthday: true },
			conference: { startConference: true }
		});
		return new Map(rows.map((row) => [row.userId, row]));
	}

	type Row =
		Awaited<ReturnType<typeof participants>> extends ReadonlyMap<string, infer R> ? R : never;

	/** Keeps a page and what it says; a failure is the person's line of the report's to tell. */
	async function keep({
		args,
		source
	}: {
		args: KeepArgs<Row>;
		source: Source;
	}): Promise<KeptPage> {
		try {
			return { outcome: await keepScan({ args, source, conferenceId }) };
		} catch (error) {
			logger.warn('Saving a scan failed', error);
			return { outcome: 'failed', error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function take({ file, source }: { file: File; source: Source }) {
		const taken = await takeScan({
			file: { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
			conferenceId,
			ports: {
				read: (scan) =>
					readPages({
						scan,
						platform: browserPlatform,
						onPage: () => (progress.pages += 1)
					}),
				check: checkCode,
				participants,
				keep: (args) => keep({ args, source }),
				onUnreadable: (error) => logger.warn('Reading a scanned file failed', error)
			}
		});
		for (const { person, participant, kept } of taken.people) {
			people = withResult({ people, result: personReport({ person, row: participant, kept }) });
		}
		problems.push(...taken.problems.filter(({ reason }) => !ON_PERSONS_LINE.includes(reason)));
	}

	// fallow-ignore-next-line complexity
	async function run({ files, source }: { files: File[]; source: Source }) {
		if (running || files.length === 0) return;
		running = true;
		problems = [];
		people = [];
		progress = { files: 0, pages: 0 };
		try {
			for (const file of files) {
				await take({ file, source });
				progress.files += 1;
			}
			if (problems.length > 0 || people.some(({ missing, error }) => missing || error)) {
				toast.error(m.paperBatchProblems(), { duration: 15_000 });
			}
		} catch (error) {
			logger.error('Taking in scans failed', error);
			toast.error(m.genericToastError());
		} finally {
			running = false;
		}
	}

	/** New scans in the watched folder, once what is being read is done. */
	async function runFolder(files: File[]) {
		while (running) await new Promise((later) => setTimeout(later, 500));
		await run({ files, source: 'FOLDER' });
	}

	function onfiles(list: FileList | null | undefined) {
		if (list) void run({ files: [...list], source: 'UPLOAD' });
	}

	function ondrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		onfiles(event.dataTransfer?.files);
	}
</script>

<section class="flex w-full flex-col gap-3" aria-label={m.paperBatchTitle()}>
	<label
		class="border-base-300 hover:border-primary rounded-box flex cursor-pointer items-center gap-3 border-2 border-dashed px-4 py-3 transition-colors {dragging
			? 'border-primary bg-primary/5'
			: ''}"
		ondragover={(event) => {
			event.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		{ondrop}
	>
		<i aria-hidden="true" class="ph-duotone ph-files text-primary text-3xl"></i>
		<span class="flex flex-col">
			<span class="font-medium">{m.paperBatchDrop()}</span>
			<span class="text-base-content/70 text-xs">{m.paperBatchHint()}</span>
		</span>
		<input
			type="file"
			class="sr-only"
			multiple
			accept="application/pdf,image/*"
			disabled={running}
			onchange={(event) => onfiles(event.currentTarget.files)}
		/>
	</label>

	<div class="flex flex-wrap items-center gap-2">
		<FolderWatch onscans={runFolder} />
		<button class="btn btn-sm" onclick={() => (setupOpen = true)}>
			<i aria-hidden="true" class="ph-duotone ph-printer"></i>
			{m.scannerSetupButton()}
		</button>
	</div>

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

	{#if problems.length > 0}
		<section class="flex flex-col gap-2">
			<h3 class="font-semibold">{m.paperBatchNotTaken()}</h3>
			<ul class="text-sm">
				{#each problems as problem, index (index)}
					<li>{describeScanProblem(problem)}</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>

{#if setupOpen}
	<Modal open wide title={m.scannerSetupTitle()} onclose={() => (setupOpen = false)}>
		<LoadBoundary>
			<ScannerSetup {conferenceId} />
		</LoadBoundary>
	</Modal>
{/if}
