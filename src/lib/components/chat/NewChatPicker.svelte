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
	import { conflictMessageOf } from '#lib/api/errorCodes';
	import {
		fetchChatContacts,
		fetchChatInboxes,
		type ChatContactRow,
		type ChatInboxRow
	} from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from './ChatAvatar.svelte';
	import CommitteeChips from './CommitteeChips.svelte';
	import InboxChoices from './InboxChoices.svelte';
	import PickerOption from './PickerOption.svelte';
	import {
		contactAvatar,
		contactDetail,
		contactName,
		contactSearchText,
		inboxDescription,
		inboxName,
		INBOX_ICON,
		matchesSearch
	} from './chatLabels';
	import { groupContacts, OTHER_GROUP } from './contactGroups';

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

	async function open(start: () => Promise<{ id: string }>) {
		if (opening) return;
		opening = true;
		try {
			onOpened((await start()).id);
		} catch (error) {
			toast.error(conflictMessageOf(error) ?? m.chatCouldNotBeOpened());
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
					participantId
				},
				id: true
			})
		);

	async function pick(contact: ChatContactRow) {
		if (mode === 'participant') {
			await open(() =>
				client.mutate.openDirectChat({
					__args: { conferenceId, participantId: contact.participantId },
					id: true
				})
			);
			return;
		}
		// the inboxes the caller answers that reach this person
		const reaching = await client.query.chatInboxes({
			__args: { conferenceId, participantId: contact.participantId },
			inbox: true,
			committeeId: true,
			committeeAbbreviation: true,
			committeeName: true,
			chatId: true
		});
		const [only] = reaching;
		if (reaching.length === 1 && only) {
			await openInbox({ option: only, participantId: contact.participantId });
		} else if (reaching.length === 0) {
			toast.error(m.chatNoInboxReaches());
		} else {
			picked = { contact, inboxes: [...reaching] };
		}
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
	}
</script>

{#if picked}
	{@const chosen = picked}
	<div class="flex flex-col gap-3">
		<button
			type="button"
			class="btn btn-ghost btn-sm gap-2 self-start"
			onclick={() => (picked = undefined)}
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
			{m.chatPickAnotherPerson()}
		</button>
		<div class="flex items-center gap-3">
			<ChatAvatar avatar={contactAvatar(chosen.contact)} />
			<div class="flex flex-col">
				<span class="font-semibold">{contactName(chosen.contact)}</span>
				<span class="text-base-content/60 text-sm">{contactDetail(chosen.contact)}</span>
			</div>
		</div>
		<p class="text-base-content/70 text-sm">{m.chatChooseInbox()}</p>
		<InboxChoices
			options={chosen.inboxes}
			disabled={opening}
			onChoose={(option) => openInbox({ option, participantId: chosen.contact.participantId })}
		/>
	</div>
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
			class="-mx-2 flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-2"
			data-testid="chat-contact-results"
		>
			{#if shownInboxes.length > 0 || showDelegation}
				<section>
					<h3 class="text-base-content/60 mb-1 px-1 text-xs font-semibold tracking-wide uppercase">
						{m.chatGroupTeamAndDelegation()}
					</h3>
					<ul class="flex flex-col">
						{#if showDelegation}
							<li>
								<PickerOption
									avatar={{ icon: 'users-three' }}
									title={m.chatMyDelegation()}
									detail={m.chatDelegationHint()}
									disabled={opening}
									onclick={() =>
										open(() =>
											client.mutate.openDelegationChat({ __args: { conferenceId }, id: true })
										)}
								/>
							</li>
						{/if}
						{#each shownInboxes as option (`${option.inbox}/${option.committeeId}`)}
							<li>
								<PickerOption
									avatar={{ icon: INBOX_ICON[option.inbox] }}
									title={inboxName(option)}
									detail={inboxDescription(option.inbox)}
									disabled={opening}
									onclick={() => openInbox({ option })}
									testId="chat-inbox-option"
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#each shownGroups as group (group.key)}
				<section>
					<h3 class="text-base-content/60 mb-1 px-1 text-xs font-semibold tracking-wide uppercase">
						{group.key === OTHER_GROUP ? m.chatGroupWithoutCommittee() : group.name}
					</h3>
					<ul class="grid grid-cols-1 sm:grid-cols-2">
						{#each group.contacts as contact (contact.participantId)}
							<li>
								<PickerOption
									avatar={contactAvatar(contact)}
									title={contactName(contact)}
									detail={contactDetail(contact)}
									disabled={opening}
									onclick={() => pick(contact)}
									testId="chat-contact"
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if nothingFound}
				<div class="text-base-content/60 flex flex-col items-center gap-2 py-8 text-center">
					<i aria-hidden="true" class="ph-duotone ph-magnifying-glass text-3xl"></i>
					<p>
						{contacts.length === 0 && inboxes.length === 0
							? m.chatNobodyToWrite()
							: m.chatNothingFound()}
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
