<script lang="ts">
	import { untrack } from 'svelte';
	import BinRow from './BinRow.svelte';
	import { buildNametagQrPdf } from '$lib/api/nametagQrPdf';
	import { buildNametagSheetsPdf, downloadPdf } from '$lib/api/nametagSheetsPdf';
	import { binTone, buildSheets, loadSheetAssets } from './nametagSheets';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';
	import { toast } from 'svelte-sonner';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import Form from '$lib/components/form/Form.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();
	const conferenceId = $derived(routeParams.conferenceId);
	// the nations are filed by their names in the language the page is shown in
	const locale = getLocale();

	const schema = z.object({ nametagBinCount: z.number().int().min(1).max(20) });

	// seeds the form once; re-reading it while someone types would discard their edit
	const stored = await client.query.conference({
		__args: { id: untrack(() => routeParams.conferenceId) },
		nametagBinCount: true
	});

	const form = superForm(
		defaults({ nametagBinCount: stored.nametagBinCount }, zod4Client(schema)),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(schema),
			onError: (e) => toast.error(e.result.error.message),
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.updateConference({
					__args: { id: conferenceId, nametagBinCount: validated.data.nametagBinCount },
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
			}
		}
	);
	const formData = $derived(form.form);

	// The split follows the input, so the team sees what a count would do before saving it. An
	// invalid input keeps showing the last valid one.
	let previewCount = $state(stored.nametagBinCount);
	$effect(() => {
		const count = $formData.nametagBinCount;
		if (schema.shape.nametagBinCount.safeParse(count).success) previewCount = count;
	});

	const bins = $derived(
		await client.liveQuery.nametagBins({
			__args: { conferenceId, binCount: previewCount, locale },
			index: true,
			fromLetter: true,
			toLetter: true,
			nationParticipants: true,
			otherParticipants: true,
			participants: true
		})
	);
	let downloading = $state(false);

	/** One sign per table: the letters big, the nations, non-state actors and roles below. */
	async function downloadSheets() {
		downloading = true;
		try {
			const [assets, sheets] = await Promise.all([
				loadSheetAssets(conferenceId),
				buildSheets(conferenceId, previewCount, locale, bins)
			]);
			downloadPdf(await buildNametagSheetsPdf({ sheets, ...assets }), 'nametag-tables.pdf');
		} catch (error) {
			reportDownloadError(error);
		} finally {
			downloading = false;
		}
	}

	let downloadingQr = $state(false);

	/** The sheet for the entrance: a QR code to the page that tells everyone where to go. */
	async function downloadQr() {
		downloadingQr = true;
		try {
			const assets = await loadSheetAssets(conferenceId);
			downloadPdf(
				await buildNametagQrPdf({
					url: `${location.origin}/dashboard/${conferenceId}/checkIn`,
					prompt: m.nametagQrPrompt(),
					...assets
				}),
				'check-in-qr.pdf'
			);
		} catch (error) {
			reportDownloadError(error);
		} finally {
			downloadingQr = false;
		}
	}

	function reportDownloadError(error: unknown) {
		console.error(error);
		toast.error(error instanceof Error ? error.message : String(error));
	}

	const totalParticipants = $derived(bins.reduce((sum, bin) => sum + bin.participants, 0) || 1);
</script>

<div class="flex w-full flex-col gap-6 p-4 md:p-8">
	<div class="card bg-base-200 flex flex-col gap-6 p-5 md:flex-row md:items-start md:gap-10">
		<div class="flex min-w-0 grow flex-col gap-2">
			<h3 class="flex items-center gap-2 text-lg font-bold">
				<i class="fa-sharp-duotone fa-solid fa-id-badge"></i>
				{m.onSiteCheckIn()}
			</h3>
			<p class="text-base-content/70 max-w-3xl">{m.onSiteCheckInDescription()}</p>
			<p class="text-base-content/70 max-w-3xl">{m.nametagBinCountHint()}</p>
		</div>
		<Form {form} class="w-full shrink-0 md:w-72">
			<FormTextInput {form} name="nametagBinCount" type="number" label={m.nametagBinCount()} />
		</Form>
	</div>

	<div class="card bg-base-200 flex flex-col gap-5 p-5">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-lg font-bold">{m.nametagBinsTitle()}</h3>
			<div class="flex flex-wrap gap-2">
				<button class="btn btn-sm" onclick={downloadQr} disabled={downloadingQr}>
					<i class="fa-sharp-duotone fa-solid fa-qrcode"></i>
					{m.nametagQrDownload()}
					{#if downloadingQr}<span class="loading loading-spinner loading-xs"></span>{/if}
				</button>
				<button class="btn btn-sm" onclick={downloadSheets} disabled={downloading}>
					<i class="fa-sharp-duotone fa-solid fa-file-pdf"></i>
					{m.nametagSheetsDownload()}
					{#if downloading}<span class="loading loading-spinner loading-xs"></span>{/if}
				</button>
			</div>
		</div>

		<div class="bg-base-300 flex h-3 w-full overflow-hidden rounded-full">
			{#each bins.filter((bin) => bin.participants > 0) as bin (bin.index)}
				<div
					class="{binTone(bin.index).bar} border-base-200 border-r-2 last:border-r-0"
					style:width="{(bin.participants / totalParticipants) * 100}%"
					title="{m.nametagBinTable()} {bin.index + 1}: {bin.participants}"
				></div>
			{/each}
		</div>

		<div class="flex flex-col gap-2">
			{#each bins as bin (bin.index)}
				<BinRow {bin} {conferenceId} binCount={previewCount} />
			{/each}
		</div>
	</div>
</div>
