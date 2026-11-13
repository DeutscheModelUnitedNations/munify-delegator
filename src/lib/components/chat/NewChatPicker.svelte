<!--
	@component
	Finds whom to write to. One search field over everything: type a country, a committee or a role
	("ger ga") and the list narrows; the committee chips narrow it without typing. Participants
	also find the team inboxes that are theirs and their delegation's group here. A team member
	picks a person first and then, when they answer several inboxes reaching that person, the inbox
	to write from.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import {
		fetchChatContacts,
		fetchChatInboxes,
		fetchReachingInboxes,
		type ChatContactRow,
		type ChatInboxRow
	} from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import CommitteeChips from './CommitteeChips.svelte';
	import PickedContactInboxes from './PickedContactInboxes.svelte';
	import PickerContactGroups from './PickerContactGroups.svelte';
	import PickerTeamOptions from './PickerTeamOptions.svelte';
	import { contactSearchText, inboxName, matchesSearch } from './chatLabels';
	import { groupContacts } from './contactGroups';
	import { chatOpenError, inboxChoice } from './inboxChoice';

	interface Props {
		conferenceId: string;
		/** `participant`: the caller writes for themselves. `team`: from an inbox they answer. */
		mode: 'participant' | 'team';
		/** Whether the caller's delegation has a group to open */
		delegationGroup?: boolean;
		onOpened: (chatId: string) => void;
	}

	let { conferenceId, mode, delegationGroup = false, onOpened }: Props = $props();

	const [contacts, inboxes] = $derived(
		await Promise.all([
			fetchChatContacts(conferenceId),
			mode === 'participant' ? fetchChatInboxes({ conferenceId }) : []
		])
	);

	let search = $state('');
	let committee = $state<string | null>(null);
	let opening = $state(false);
	/** Team mode: the person picked, while the inbox to write from is chosen. */
	let picked = $state<{ contact: ChatContactRow; inboxes: ChatInboxRow[] }>();

	const groups = $derived(groupContacts(contacts));
	const searchable = $derived(
		contacts.map((contact) => ({ contact, haystack: contactSearchText(contact) }))
	);
	const found = $derived(
		new Set(
			searchable
				.filter(({ haystack }) => matchesSearch({ haystack, search }))
				.map(({ contact }) => contact.participantId)
		)
	);
	const shownGroups = $derived(
		groups
			.filter((group) => committee === null || group.key === committee)
			.map((group) => ({
				...group,
				contacts: group.contacts.filter((contact) => found.has(contact.participantId))
			}))
			.filter((group) => group.contacts.length > 0)
	);
	const shownInboxes = $derived(
		committee === null
			? inboxes.filter((option) =>
					matchesSearch({
						haystack: `${inboxName(option)} ${m.team()}`.toLocaleLowerCase(),
						search
					})
				)
			: []
	);
	const showDelegation = $derived(
		delegationGroup &&
			committee === null &&
			matchesSearch({ haystack: m.chatMyDelegation().toLocaleLowerCase(), search })
	);
	const nothingFound = $derived(
		shownGroups.length === 0 && shownInboxes.length === 0 && !showDelegation
	);
	const nobody = $derived(contacts.length === 0 && inboxes.length === 0);

	async function open(start: () => Promise<{ id: string }>) {
		if (opening) return;
		opening = true;
		try {
			onOpened((await start()).id);
		} catch (error) {
			toast.error(chatOpenError(error));
		} finally {
			opening = false;
		}
	}

	const openInbox = ({ option, participantId }: { option: ChatInboxRow; participantId?: string }) =>
		open(() =>
			client.mutate.openTeamChat({
				__args: {
					conferenceId,
					inbox: option.inbox,
					committeeId: option.committeeId,
					trustedPersonId: option.trustedPersonId,
					participantId
				},
				id: true
			})
		);

	async function pick(contact: ChatContactRow) {
		const { participantId } = contact;
		if (mode === 'participant') {
			await open(() =>
				client.mutate.openDirectChat({ __args: { conferenceId, participantId }, id: true })
			);
			return;
		}
		// the inboxes the caller answers that reach this person
		const choice = inboxChoice(await fetchReachingInboxes({ conferenceId, participantId }));
		if (choice.kind === 'one') await openInbox({ option: choice.option, participantId });
		else if (choice.kind === 'none') toast.error(m.chatNoInboxReaches());
		else picked = { contact, inboxes: choice.options };
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
	}
</script>

{#if picked}
	<PickedContactInboxes
		contact={picked.contact}
		inboxes={picked.inboxes}
		disabled={opening}
		onBack={() => (picked = undefined)}
		onChoose={(option) => openInbox({ option, participantId: picked?.contact.participantId })}
	/>
{:else}
	<div class="flex flex-col gap-3">
		<label class="input input-bordered flex w-full items-center gap-2">
			<i aria-hidden="true" class="ph-duotone ph-magnifying-glass text-base-content/60"></i>
			<input
				type="search"
				class="grow"
				placeholder={m.chatSearchPlaceholder()}
				aria-label={m.chatSearchPlaceholder()}
				bind:value={search}
				use:focusOnMount
				data-testid="chat-contact-search"
			/>
		</label>

		{#if groups.length > 1}
			<CommitteeChips {groups} selected={committee} onSelect={(key) => (committee = key)} />
		{/if}

		<div
			class="-mx-2 flex max-h-96 flex-col gap-3 overflow-y-auto px-2"
			data-testid="chat-contact-results"
		>
			<PickerTeamOptions
				inboxes={shownInboxes}
				delegation={showDelegation}
				disabled={opening}
				onInbox={(option) => openInbox({ option })}
				onDelegation={() =>
					open(() => client.mutate.openDelegationChat({ __args: { conferenceId }, id: true }))}
			/>
			<PickerContactGroups groups={shownGroups} disabled={opening} onPick={pick} />

			{#if nothingFound}
				<div class="text-base-content/60 flex flex-col items-center gap-2 py-8 text-center">
					<i aria-hidden="true" class="ph-duotone ph-magnifying-glass text-3xl"></i>
					<p>{nobody ? m.chatNobodyToWrite() : m.chatNothingFound()}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
