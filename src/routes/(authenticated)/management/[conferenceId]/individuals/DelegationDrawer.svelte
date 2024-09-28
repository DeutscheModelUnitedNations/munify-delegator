<script lang="ts">
	import Drawer from 'svelte-drawer-component';
	import { apiClient, checkForError } from '$api/client';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import type { SingleParticipant, User, CustomConferenceRole } from '@prisma/client';

	type SingleParticipantData = SingleParticipant & {
		user: Pick<User, 'id' | 'given_name' | 'family_name'>;
		appliedForRoles: CustomConferenceRole[];
	};

	interface Props {
		singleParticipant: SingleParticipantData | null;
		onClose: () => void;
		data: PageData;
	}

	let { singleParticipant, onClose, data }: Props = $props();

	let api = apiClient({ origin: data.url.origin });
</script>

<Drawer open={singleParticipant != null} size="600px" placement="right" on:clickAway={onClose}>
	<div class="flex flex-col p-10 bg-base-100 min-h-full gap-8">
		<div class="flex flex-col gap-2">
			<h3 class="text-xl uppercase font-thin">{m.singleParticipant()}</h3>
			<h2 class="text-3xl font-bold p-2 bg-base-300 rounded-md">
				{singleParticipant?.user?.given_name}
				<span class="uppercase">{singleParticipant?.user?.family_name}</span>
			</h2>
			<h3 class="text-sm font-thin">{singleParticipant?.id}</h3>
		</div>

		{#if singleParticipant?.applied}
			<div class="alert alert-success">
				<i class="fas fa-check"></i>
				{m.registrationCompleted()}
			</div>
		{:else}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-half"></i>
				{m.registrationNotCompleted()}
			</div>
		{/if}

		<div class="flex flex-col">
			<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
						<td>
							{singleParticipant?.school}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
						<td>
							{singleParticipant?.motivation}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
						<td>
							{singleParticipant?.experience}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-check-to-slot text-lg"></i></td>
						<td>
							<div class="flex items-center gap-2">
								<div class="bg-base-300 py-[2px] px-3 rounded-md h-full">
									{singleParticipant?.appliedForRoles.length}
								</div>
								<div class="flex flex-col">
									{#each singleParticipant?.appliedForRoles ?? [] as role}
										<div>
											<i class="fa-duotone fa-{(role?.fontAwesomeIcon ?? '').replace('fa-', '')}"
											></i>
											{role.name}
										</div>
									{/each}
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		{#if singleParticipant?.applied}
			<div class="flex flex-col gap-2">
				<h3 class="text-xl font-bold">{m.adminActions()}</h3>
				<button
					class="btn"
					onclick={async () => {
						if (!confirm('Willst du wirklich den Bewerbungsstatus zurücksetzen?')) return;
						await checkForError(
							api.singleParticipant({ id: singleParticipant!.id }).revokeApplication.patch()
						);
						// TODO: Fix this, so that the page does not need to be reloaded. invalidateAll() does not work.
						alert('Neuladen der Seite erforderlich, um die Änderungen zu sehen.');
					}}
				>
					<i class="fa-duotone fa-file-slash"></i>
					{m.revokeApplication()}
				</button>
			</div>
		{/if}

		<button class="btn absolute top-4 right-4" onclick={onClose} aria-label="Close">
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
