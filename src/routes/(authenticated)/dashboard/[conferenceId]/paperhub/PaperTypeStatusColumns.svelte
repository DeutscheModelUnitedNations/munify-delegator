<script lang="ts">
	import type { PaperstatusEnum, PapertypeEnum } from '$lib/api/rumbleClient/client';
	import PaperEnum from '$lib/components/paper/paperEnum';
	import { m } from '$lib/paraglide/messages';

	/**
	 * The leading type and status columns of a paper list table: their header cells when `paper`
	 * is left out, the paper's cells otherwise.
	 */
	let { paper }: { paper?: { type: PapertypeEnum; status: PaperstatusEnum } } = $props();
</script>

{#if paper}
	<td class="align-middle">
		<PaperEnum.Type type={paper.type} size="xs" />
	</td>
	<td class="align-middle">
		<PaperEnum.Status status={paper.status} size="xs" />
	</td>
{:else}
	<th class="w-0">{m.paperType()}</th>
	<th class="w-0">{m.paperStatus()}</th>
{/if}
