<script lang="ts">
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import UserSuggestions from './UserSuggestions.svelte';
	import AssignmentTarget from './AssignmentTarget.svelte';
	import { untrack, type Snippet } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { page } from '$app/state';

	interface Props {
		open: boolean;
		user: Partial<UserPreview> | undefined;
		targetRole: string;
		addParticipant: () => Promise<void>;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		user = $bindable(),
		targetRole,
		addParticipant,
		children
	}: Props = $props();

	const params = queryParameters({
		assignUserId: true
	});

	let search = $state(params.assignUserId ?? '');
	let loading = $state(false);

	// Every seat button holds its own modal, so all of them were prefilled from the URL. Follow the
	// param when it changes, otherwise clearing it after an assignment leaves the old id (and the
	// user it resolved to) in every other modal.
	$effect(() => {
		const prefill = params.assignUserId ?? '';
		untrack(() => {
			if (prefill === search) return;
			search = prefill;
			if (!prefill) user = undefined;
		});
	});

	// Parsed from the path rather than `page.params`, which can be a placeholder right after hydration.
	const conferenceId = $derived(page.url.pathname.match(/^\/dashboard\/([^/]+)/)?.[1]);

	/** Ids of the suggested users who already hold some part in this conference. */
	let inConference = $state<ReadonlySet<string>>(new Set());
	let suggestions = $state<UserPreview[]>([]);

	// Fuzzy suggestions while typing. An input that is exactly an id or an email selects that user
	// right away, which is what the waiting list prefill relies on.
	$effect(() => {
		const term = search.trim();
		if (term.length < 2) {
			suggestions = [];
			loading = false;
			return;
		}

		let stale = false;
		const forConference = { where: { conferenceId: { eq: conferenceId ?? '' } } };
		loading = true;
		const timeout = setTimeout(() => {
			client.query
				.users({
					__args: { search: term, limit: 8 },
					id: true,
					givenName: true,
					familyName: true,
					email: true,
					delegationMemberships: { __args: forConference, id: true },
					singleParticipant: { __args: forConference, id: true },
					conferenceSupervisor: { __args: forConference, id: true },
					teamMember: { __args: forConference, id: true }
				})
				.then((found) => {
					if (stale) return;
					const results = found.map((candidate) => ({
						id: candidate.id,
						email: candidate.email,
						given_name: candidate.givenName,
						family_name: candidate.familyName
					}));
					suggestions = results;
					inConference = new Set(
						found
							.filter(
								(candidate) =>
									candidate.delegationMemberships.length > 0 ||
									candidate.singleParticipant.length > 0 ||
									candidate.conferenceSupervisor.length > 0 ||
									candidate.teamMember.length > 0
							)
							.map((candidate) => candidate.id)
					);
					const exact = results.find(
						(candidate) =>
							candidate.id === term || candidate.email.toLowerCase() === term.toLowerCase()
					);
					if (exact) user = exact;
					else if (!results.some((candidate) => candidate.id === user?.id)) user = undefined;
				})
				.catch((error) => console.error(error))
				.finally(() => {
					if (!stale) loading = false;
				});
		}, 250);

		return () => {
			stale = true;
			clearTimeout(timeout);
		};
	});

	$effect(() => {
		if (open) {
			// autofocus the input field
			const input = document.getElementById('emailOrId') as HTMLInputElement;
			if (input) {
				input.focus();
			}
		}
	});
</script>

{#snippet action()}
	<button class="btn btn-error" onclick={() => (open = false)}>{m.close()}</button>
	<button
		class="btn btn-success {!user && 'btn-disabled'}"
		onclick={async () => {
			await addParticipant();
			open = false;
			user = undefined;
			search = '';
			if (params.assignUserId) {
				params.assignUserId = null;
			}
		}}>{m.addUser()}</button
	>
{/snippet}

<Modal bind:open {action} title={m.addParticipant()}>
	<div class="flex w-full flex-col items-center gap-4">
		<input
			type="text"
			id="emailOrId"
			bind:value={search}
			placeholder={m.emailOrId()}
			class="input w-full"
		/>

		<UserSuggestions
			{suggestions}
			{inConference}
			selectedId={user?.id}
			onSelect={(suggestion) => (user = suggestion)}
		/>

		<div class="flex w-full flex-col gap-4">
			<AssignmentTarget
				{user}
				{loading}
				alreadyInConference={!!user?.id && inConference.has(user.id)}
				{targetRole}
			/>
			{#if children && user}
				<div class="flex w-full flex-col gap-2">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</Modal>
