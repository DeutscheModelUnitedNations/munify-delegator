<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '#lib/paraglide/messages';
	import { formalitiesOf, isOpen, needsGuardian, type FormalityKey } from '../formalities';
	import FormalityRow from '../sections/FormalityRow.svelte';
	import { FORMALITY_META } from '../sections/formalityOptions';
	import {
		changeParticipantStatus,
		fetchStatusWithAge,
		type StatusChange
	} from '../tabs/participantStatus';

	/**
	 * What the person still has to settle, changed right here, with what is done in one line.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor }: Props = $props();

	const data = $derived(await fetchStatusWithAge({ userId, conferenceId }));
	const status = $derived(data.statuses.at(0));
	const statusId = $derived(status?.id);
	const formalities = $derived(
		formalitiesOf({
			status,
			needsGuardian: needsGuardian({
				isConferenceSupervisor,
				birthday: data.user.birthday,
				startConference: data.conference.startConference
			})
		})
	);

	// A status changed here keeps its row, so a wrong click can be taken back and the next row does
	// not move under the pointer.
	const changed = new SvelteSet<FormalityKey>();
	const open = $derived(formalities.filter(isOpen));
	const rows = $derived(
		formalities.filter((formality) => isOpen(formality) || changed.has(formality.key))
	);
	const rest = $derived(formalities.filter((formality) => !rows.includes(formality)));
	const titles = (list: typeof formalities) =>
		list.map(({ key }) => FORMALITY_META[key].title()).join(', ');

	const change = (key: FormalityKey) => (input: StatusChange) => {
		changed.add(key);
		return changeParticipantStatus({ target: { id: statusId, conferenceId, userId }, input });
	};
</script>

<section
	class="rounded-box flex flex-col gap-1 border py-3 {open.length > 0
		? 'border-warning'
		: 'border-success'}"
>
	<h3 class="px-4 font-bold {open.length > 0 ? '' : 'text-success'}">
		{#if open.length > 0}
			{m.userCardOpenCount({ count: open.length })}
		{:else}
			<i aria-hidden="true" class="ph-duotone ph-check-circle"></i>
			{m.userCardFormalitiesDone()}
		{/if}
	</h3>
	{#each rows as formality (formality.key)}
		<FormalityRow formality={formality.key} {status} change={change(formality.key)} />
	{/each}
	{#if rest.length > 0}
		<p class="text-base-content/60 px-4 text-sm">
			<i aria-hidden="true" class="ph-duotone ph-check text-success mr-1"></i>
			{m.userCardDoneList({ list: titles(rest) })}
		</p>
	{/if}
</section>
