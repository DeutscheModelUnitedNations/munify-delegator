<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { auditOutcomeBadge, formatAuditArguments } from './auditEntry';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// The page is keyed by its pathname, so the conference never changes under it.
	const conferenceId = untrack(() => params.conferenceId);

	const [conference, serverUrl, entries] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, mcpEnabled: true }),
			client.query.mcpServerUrl(),
			client.liveQuery.mcpAuditEntries({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { createdAt: 'desc' },
					limit: 200
				},
				id: true,
				createdAt: true,
				tool: true,
				outcome: true,
				message: true,
				durationMs: true,
				arguments: true,
				user: { givenName: true, familyName: true }
			})
		])
	);

	let saving = $state(false);

	async function setEnabled(input: HTMLInputElement) {
		const enabled = input.checked;
		saving = true;
		try {
			const promise = Promise.resolve(
				client.mutate.setConferenceMcpEnabled({ __args: { conferenceId, enabled } })
			);
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		} catch {
			// The toast shows the error; the switch goes back to what is stored.
			input.checked = !enabled;
		} finally {
			saving = false;
		}
	}

	const time = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'medium' });
</script>

<div class="flex flex-col gap-6">
	<p class="max-w-3xl opacity-70">{m.aiAccessIntro()}</p>

	<div class="alert alert-info max-w-3xl">
		<i aria-hidden="true" class="ph-duotone ph-shield-check"></i>
		<span>{m.aiAccessPrivacy()}</span>
	</div>

	<FormFieldset title={m.aiAccess()}>
		<label class="label cursor-pointer justify-start gap-3 whitespace-normal">
			<input
				type="checkbox"
				class="toggle toggle-primary shrink-0"
				checked={conference?.mcpEnabled ?? false}
				disabled={saving || !conference}
				onchange={(event) => setEnabled(event.currentTarget)}
			/>
			<span class="label-text">{m.aiAccessEnabledLabel()}</span>
		</label>
		<p class="mt-1 text-xs opacity-50">{m.aiAccessEnabledHint()}</p>
	</FormFieldset>

	<FormFieldset title={m.aiAccessConnectTitle()}>
		{#if serverUrl}
			<p class="text-sm">{m.aiAccessConnectHelp()}</p>
			<code class="bg-base-100 rounded-box block w-full overflow-x-auto p-3 text-sm">
				{serverUrl}
			</code>
		{:else}
			<p class="text-sm opacity-70">{m.aiAccessNotConfigured()}</p>
		{/if}
	</FormFieldset>

	<section class="flex flex-col gap-2">
		<h2 class="text-xl font-bold">{m.aiAccessLogTitle()}</h2>
		<p class="text-sm opacity-70">{m.aiAccessLogDescription()}</p>
		{#if entries.length === 0}
			<p class="py-6 text-center opacity-60">{m.aiAccessLogEmpty()}</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="table-zebra table-sm table">
					<thead>
						<tr>
							<th>{m.aiAccessColumnTime()}</th>
							<th>{m.aiAccessColumnPerson()}</th>
							<th>{m.aiAccessColumnTool()}</th>
							<th>{m.aiAccessColumnOutcome()}</th>
							<th>{m.aiAccessColumnDetails()}</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as entry (entry.id)}
							{@const badge = auditOutcomeBadge(entry.outcome)}
							<tr>
								<td class="whitespace-nowrap">{time.format(new Date(entry.createdAt))}</td>
								<td class="whitespace-nowrap">
									{entry.user
										? `${entry.user.givenName} ${entry.user.familyName}`
										: m.aiAccessUnknownPerson()}
								</td>
								<td class="font-mono text-xs">{entry.tool}</td>
								<td><span class="badge badge-sm {badge.class}">{badge.label()}</span></td>
								<td class="max-w-md">
									{#if entry.message}
										<p class="text-xs">{entry.message}</p>
									{/if}
									<p
										class="truncate font-mono text-xs opacity-60"
										title={formatAuditArguments(entry.arguments)}
									>
										{formatAuditArguments(entry.arguments)}
									</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
