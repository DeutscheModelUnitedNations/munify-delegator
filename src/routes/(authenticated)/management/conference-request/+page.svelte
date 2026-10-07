<script lang="ts">
	import { onMount } from 'svelte';
	import worldCountries from 'world-countries';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormLabel from '$lib/components/Form/FormLabel.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		emptyRequestForm,
		fromSeedJsonText,
		isNonexistentLocalTime,
		newCommittee,
		newNsa,
		newRole,
		toSeedJson
	} from '$lib/seeding/conferenceRequest';
	import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';

	const DRAFT_STORAGE_KEY = 'conference-request-draft';

	let form = $state(emptyRequestForm());
	let draftLoaded = $state(false);
	let importText = $state('');
	let importError = $state(false);

	const nationOptions = worldCountries
		.filter((country) => country.unMember)
		.map((country) => ({
			code: country.cca2,
			name:
				(getLocale() === 'de' ? country.translations.deu?.common : undefined) ?? country.name.common
		}))
		.sort((a, b) => a.name.localeCompare(b.name, getLocale()));
	const nationNames = new Map(nationOptions.map((nation) => [nation.code, nation.name]));

	const seedJson = $derived(toSeedJson(form));
	const jsonText = $derived(JSON.stringify(seedJson, null, '\t'));
	const validation = $derived(ConferenceSeedingSchema.safeParse(seedJson));
	const validationErrors = $derived(validation.success ? null : z.prettifyError(validation.error));

	// The draft is stored in the very format the page produces, so loading it is the same as importing.
	onMount(() => {
		try {
			const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
			const restored = stored ? fromSeedJsonText(stored) : null;
			if (restored) form = restored;
		} catch {
			// storage can be unavailable (private mode, blocked site data); the form just starts empty
		}
		draftLoaded = true;
	});

	$effect(() => {
		const serialized = jsonText;
		if (!draftLoaded) return;
		try {
			localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
		} catch {
			// see onMount
		}
	});

	const importJson = (raw: string) => {
		const imported = fromSeedJsonText(raw);
		importError = imported === null;
		if (imported) {
			form = imported;
			importText = '';
		}
	};

	const importFile = async (event: Event & { currentTarget: HTMLInputElement }) => {
		// currentTarget is reset once the event dispatch ends, so keep the input before awaiting
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (file) importJson(await file.text());
		input.value = '';
	};

	const resetForm = () => {
		form = emptyRequestForm();
		importError = false;
	};

	const copyJson = async () => {
		await navigator.clipboard.writeText(jsonText);
		toast.success(m.conferenceRequestCopied());
	};

	const downloadJson = () => {
		const url = URL.createObjectURL(new Blob([jsonText], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `${form.title.trim().replace(/\W+/g, '-').toLowerCase() || 'conference'}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const addNation = (committeeKey: string, event: Event & { currentTarget: HTMLSelectElement }) => {
		const code = event.currentTarget.value;
		event.currentTarget.value = '';
		const committee = form.committees.find((c) => c.key === committeeKey);
		if (committee && code && !committee.nations.includes(code)) committee.nations.push(code);
	};

	const removeAt = (list: { key: string }[], key: string) => {
		const index = list.findIndex((item) => item.key === key);
		if (index >= 0) list.splice(index, 1);
	};
</script>

{#snippet timeError(value: string)}
	{#if isNonexistentLocalTime(value)}
		<p class="text-error mt-1 text-sm">{m.conferenceRequestNonexistentTime()}</p>
	{/if}
{/snippet}

{#snippet addButton(label: string, onclick: () => void)}
	<button type="button" class="btn btn-sm self-start" {onclick}>
		<i class="fa-duotone fa-plus"></i>
		{label}
	</button>
{/snippet}

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
	<header class="flex flex-col gap-1">
		<h1 class="text-3xl font-bold">{m.conferenceRequest()}</h1>
		<p class="text-base-content/70 max-w-3xl">{m.conferenceRequestDescription()}</p>
		<p class="text-base-content/60 text-sm">
			{m.conferenceRequestDraftHint()}
			{m.conferenceRequestTimezoneHint()}
		</p>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
		<div class="flex flex-col gap-4">
			<FormFieldset title={m.conference()}>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<label class="flex flex-col">
						<FormLabel label={m.title()} />
						<input class="input w-full" bind:value={form.title} />
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.longTitle()} />
						<input class="input w-full" bind:value={form.longTitle} />
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.location()} />
						<input class="input w-full" bind:value={form.location} />
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.language()} />
						<input class="input w-full" bind:value={form.language} />
					</label>
					<label class="flex flex-col md:col-span-2">
						<FormLabel label={m.website()} />
						<input
							type="url"
							class="input w-full"
							placeholder="https://"
							bind:value={form.website}
						/>
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.applicationDeadline()} />
						<input type="datetime-local" class="input w-full" bind:value={form.startAssignment} />
						{@render timeError(form.startAssignment)}
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.startConference()} />
						<input type="datetime-local" class="input w-full" bind:value={form.startConference} />
						{@render timeError(form.startConference)}
					</label>
					<label class="flex flex-col">
						<FormLabel label={m.endConference()} />
						<input type="datetime-local" class="input w-full" bind:value={form.endConference} />
						{@render timeError(form.endConference)}
					</label>
				</div>
			</FormFieldset>

			<FormFieldset title={m.committees()}>
				<div class="flex flex-col gap-4">
					{#each form.committees as committee (committee.key)}
						<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-3 border p-4">
							<div class="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
								<label class="flex flex-col">
									<FormLabel label={m.name()} />
									<input class="input w-full" bind:value={committee.name} />
								</label>
								<label class="flex flex-col">
									<FormLabel label={m.abbreviation()} />
									<input class="input w-full" maxlength="5" bind:value={committee.abbreviation} />
								</label>
								<label class="flex flex-col">
									<FormLabel label={m.seatsPerDelegation()} />
									<input
										type="number"
										min="1"
										class="input w-full"
										bind:value={committee.numOfSeatsPerDelegation}
									/>
								</label>
								<button
									type="button"
									class="btn btn-ghost btn-square text-error"
									aria-label={m.delete()}
									onclick={() => removeAt(form.committees, committee.key)}
								>
									<i class="fa-duotone fa-trash"></i>
								</button>
							</div>

							<div class="flex flex-col gap-2">
								<span class="label">{m.nations()} ({committee.nations.length})</span>
								<div class="flex flex-wrap gap-1">
									{#each committee.nations as code (code)}
										<button
											type="button"
											class="badge badge-neutral gap-1"
											title={m.delete()}
											onclick={() => {
												committee.nations = committee.nations.filter((c) => c !== code);
											}}
										>
											{nationNames.get(code) ?? code}
											<i class="fa-solid fa-xmark"></i>
										</button>
									{/each}
								</div>
								<div class="flex flex-wrap gap-2">
									<select
										class="select select-sm w-full max-w-xs"
										aria-label={m.addNation()}
										onchange={(event) => addNation(committee.key, event)}
									>
										<option value="">{m.addNation()}</option>
										{#each nationOptions.filter((nation) => !committee.nations.includes(nation.code)) as nation (nation.code)}
											<option value={nation.code}>{nation.name}</option>
										{/each}
									</select>
									<button
										type="button"
										class="btn btn-sm"
										onclick={() => {
											committee.nations = nationOptions.map((nation) => nation.code);
										}}
									>
										{m.addAllUnMembers()}
									</button>
								</div>
							</div>
						</div>
					{:else}
						<p class="text-base-content/60 text-sm">{m.conferenceRequestNoEntries()}</p>
					{/each}
					{@render addButton(m.addCommittee(), () => form.committees.push(newCommittee()))}
				</div>
			</FormFieldset>

			<FormFieldset title={m.nonStateActors()}>
				<div class="flex flex-col gap-4">
					{#each form.nsa as nsa (nsa.key)}
						<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-3 border p-4">
							<div class="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
								<label class="flex flex-col">
									<FormLabel label={m.name()} />
									<input class="input w-full" bind:value={nsa.name} />
								</label>
								<label class="flex flex-col">
									<FormLabel label={m.abbreviation()} />
									<input class="input w-full" maxlength="5" bind:value={nsa.abbreviation} />
								</label>
								<label class="flex flex-col">
									<FormLabel label={m.seatAmount()} />
									<input type="number" min="1" class="input w-full" bind:value={nsa.seatAmount} />
								</label>
								<button
									type="button"
									class="btn btn-ghost btn-square text-error"
									aria-label={m.delete()}
									onclick={() => removeAt(form.nsa, nsa.key)}
								>
									<i class="fa-duotone fa-trash"></i>
								</button>
							</div>
							<label class="flex flex-col">
								<FormLabel label={m.fontAwesomeIcon()} />
								<input
									class="input w-full"
									placeholder="fa-church"
									bind:value={nsa.fontAwesomeIcon}
								/>
							</label>
							<label class="flex flex-col">
								<FormLabel label={m.description()} />
								<textarea class="textarea w-full" rows="2" bind:value={nsa.description}></textarea>
							</label>
						</div>
					{:else}
						<p class="text-base-content/60 text-sm">{m.conferenceRequestNoEntries()}</p>
					{/each}
					{@render addButton(m.addNonStateActor(), () => form.nsa.push(newNsa()))}
				</div>
			</FormFieldset>

			<FormFieldset title={m.customRoles()}>
				<div class="flex flex-col gap-4">
					{#each form.customConferenceRole as role (role.key)}
						<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-3 border p-4">
							<div class="grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_auto] md:items-end">
								<label class="flex flex-col">
									<FormLabel label={m.name()} />
									<input class="input w-full" bind:value={role.name} />
								</label>
								<label class="flex flex-col">
									<FormLabel label={m.fontAwesomeIcon()} />
									<input
										class="input w-full"
										placeholder="fa-camera"
										bind:value={role.fontAwesomeIcon}
									/>
								</label>
								<button
									type="button"
									class="btn btn-ghost btn-square text-error"
									aria-label={m.delete()}
									onclick={() => removeAt(form.customConferenceRole, role.key)}
								>
									<i class="fa-duotone fa-trash"></i>
								</button>
							</div>
							<label class="flex flex-col">
								<FormLabel label={m.description()} />
								<textarea class="textarea w-full" rows="2" bind:value={role.description}></textarea>
							</label>
						</div>
					{:else}
						<p class="text-base-content/60 text-sm">{m.conferenceRequestNoEntries()}</p>
					{/each}
					{@render addButton(m.addCustomRole(), () => form.customConferenceRole.push(newRole()))}
				</div>
			</FormFieldset>
		</div>

		<aside class="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
			<FormFieldset title={m.conferenceRequestJson()}>
				{#if validationErrors}
					<div class="alert alert-error alert-soft">
						<div class="flex min-w-0 flex-col">
							<h3 class="font-bold">{m.validationFailed()}</h3>
							<pre
								class="max-h-48 overflow-auto text-xs break-all whitespace-pre-wrap">{validationErrors}</pre>
						</div>
					</div>
				{:else}
					<div class="alert alert-success alert-soft">
						<h3 class="font-bold">{m.validationSuccessful()}</h3>
					</div>
				{/if}

				<pre
					class="bg-base-100 rounded-box border-base-300 max-h-96 overflow-auto border p-3 text-xs">{jsonText}</pre>

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="btn btn-primary"
						disabled={!validation.success}
						onclick={copyJson}
					>
						<i class="fa-duotone fa-copy"></i>
						{m.copy()}
					</button>
					<button type="button" class="btn" disabled={!validation.success} onclick={downloadJson}>
						<i class="fa-duotone fa-download"></i>
						{m.download()}
					</button>
					<button type="button" class="btn btn-ghost text-error ml-auto" onclick={resetForm}>
						{m.reset()}
					</button>
				</div>
			</FormFieldset>

			<FormFieldset title={m.conferenceRequestImportTitle()}>
				<input
					type="file"
					accept=".json,application/json"
					class="file-input w-full"
					onchange={importFile}
				/>
				<textarea
					class="textarea w-full font-mono text-xs"
					rows="4"
					placeholder={m.conferenceRequestImportPlaceholder()}
					bind:value={importText}
				></textarea>
				{#if importError}
					<p class="text-error text-sm">{m.conferenceRequestImportInvalid()}</p>
				{/if}
				<button
					type="button"
					class="btn btn-sm self-start"
					disabled={!importText.trim()}
					onclick={() => importJson(importText)}
				>
					<i class="fa-duotone fa-file-import"></i>
					{m.import()}
				</button>
			</FormFieldset>
		</aside>
	</div>
</div>
