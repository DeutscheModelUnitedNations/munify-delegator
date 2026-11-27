<!--
	@component
	Adds an agenda item to a committee in place: a button that opens title, teaser and points for
	discussion below the committee's agenda items.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { withoutBlankPoints } from '#lib/schemata/discussionPoints';
	import AgendaItemFields from './AgendaItemFields.svelte';

	let { committeeId }: { committeeId: string } = $props();

	let open = $state(false);
	let title = $state('');
	let teaserText = $state('');
	let discussionPoints = $state<string[]>([]);
	let saving = $state(false);

	const valid = $derived(!!title.trim());

	function close() {
		open = false;
		title = '';
		teaserText = '';
		discussionPoints = [];
	}

	async function create() {
		saving = true;
		try {
			const promise = client.mutate.createAgendaItem({
				__args: {
					committeeId,
					title: title.trim(),
					teaserText: teaserText.trim() || undefined,
					discussionPoints: withoutBlankPoints(discussionPoints)
				},
				id: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			close();
		} catch {
			// the toast shows what went wrong; the fields keep the entry
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<section
		class="border-base-300 bg-base-200 rounded-box flex flex-col gap-4 border p-4"
		aria-label={m.createNewAgendaItem()}
	>
		<h4 class="font-bold">{m.createNewAgendaItem()}</h4>
		<AgendaItemFields bind:title bind:teaserText bind:discussionPoints />
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="btn btn-primary btn-sm"
				disabled={!valid || saving}
				onclick={create}
			>
				<i aria-hidden="true" class="ph-duotone ph-plus"></i>
				{m.create()}
			</button>
			<button type="button" class="btn btn-ghost btn-sm" disabled={saving} onclick={close}>
				{m.cancel()}
			</button>
		</div>
	</section>
{:else}
	<button
		type="button"
		class="btn btn-ghost btn-sm border-base-content/20 w-full border-dashed"
		data-tour="team.committees.add-agenda-item"
		onclick={() => (open = true)}
	>
		<i aria-hidden="true" class="ph-duotone ph-plus"></i>
		{m.createNewAgendaItem()}
	</button>
{/if}
