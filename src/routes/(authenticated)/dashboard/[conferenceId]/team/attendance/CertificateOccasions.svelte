<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { toast } from 'svelte-sonner';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Not live (a computed list): it is fetched again after each change, and on request.
	let revision = $state(0);
	const occasions = $derived(
		await client.query.certificateOccasions({
			__args: { conferenceId, revision },
			name: true,
			sessions: true,
			entries: true,
			firstStartedAt: true,
			showOnCertificate: true
		})
	);

	let saving = $state<string>();

	async function toggle(occasion: string, show: boolean) {
		saving = occasion;
		try {
			await client.mutate.setAttendanceOccasionOnCertificate({
				__args: { conferenceId, occasion, show }
			});
			revision++;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			saving = undefined;
		}
	}
</script>

<details class="bg-base-200 rounded-box">
	<summary class="cursor-pointer p-3 font-semibold">
		<i class="fa-sharp-duotone fa-solid fa-file-certificate mr-2"></i>
		{m.certificateOccasionsTitle()}
	</summary>
	<div class="flex flex-col gap-2 px-3 pb-3">
		<p class="text-base-content/70 text-sm">{m.certificateOccasionsDescription()}</p>
		{#if occasions.length === 0}
			<p class="text-base-content/60 text-sm italic">{m.certificateOccasionsEmpty()}</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each occasions as occasion (occasion.name)}
					<li class="bg-base-100 flex items-center gap-3 rounded-box px-3 py-2">
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate font-medium">{occasion.name}</span>
							<span class="text-base-content/60 text-xs">
								{occasion.firstStartedAt.toLocaleString(getLocale(), {
									dateStyle: 'short',
									timeStyle: 'short'
								})}
								· {m.certificateOccasionsCounts({
									sessions: occasion.sessions,
									entries: occasion.entries
								})}
							</span>
						</div>
						<label class="label cursor-pointer gap-2 text-sm">
							<span class="hidden sm:inline">{m.certificateOccasionsShow()}</span>
							<input
								type="checkbox"
								class="toggle toggle-success toggle-sm"
								checked={occasion.showOnCertificate}
								disabled={saving === occasion.name}
								aria-label={m.certificateOccasionsShowFor({ occasion: occasion.name })}
								onchange={(event) => toggle(occasion.name, event.currentTarget.checked)}
							/>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
