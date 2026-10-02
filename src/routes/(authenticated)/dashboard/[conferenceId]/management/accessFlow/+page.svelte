<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import ScanFlowPage from '$lib/components/scanner/ScanFlowPage.svelte';
	import { ScannedUserFlow } from '$lib/components/scanner/scannedUserFlow.svelte';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import ParticipantRoleSummary from './ParticipantRoleSummary.svelte';
	import type { PageProps } from './$types';
	import {
		identityUpdate,
		planAccessFlowSave,
		savesAnything,
		type AccessFlowSave
	} from './accessFlowSave';

	let { params: routeParams }: PageProps = $props();

	// Session state
	let occasion = persisted('accessFlowOccasion', '');

	// Access card input state
	let accessCardInput = $state('');
	let accessCardInputElem = $state<HTMLInputElement>();

	// --- Data queries ---

	/**
	 * The scanned person's access card. What they are in the conference is shown, and fetched, by
	 * `ParticipantRoleSummary`.
	 */
	const flow = new ScannedUserFlow(async (userId) => {
		const statuses = await client.query.conferenceParticipantStatuses({
			__args: {
				where: { conferenceId: { eq: routeParams.conferenceId }, userId: { eq: userId } }
			},
			id: true,
			accessCardId: true
		});
		return statuses.at(0) ?? null;
	});

	// --- Effects ---

	// Pre-fill access card input when user data loads
	$effect(() => {
		const status = flow.data?.status;
		if (status?.accessCardId) {
			accessCardInput = status.accessCardId;
		} else {
			accessCardInput = '';
		}
	});

	// Auto-focus access card input when drawer opens
	$effect(() => {
		if (flow.drawerOpen && accessCardInputElem) {
			setTimeout(() => accessCardInputElem?.focus(), 200);
		}
	});

	// --- Actions ---

	/** Stores the access card on the person's status row, creating the row if there is none. */
	const saveAccessCard = (statusId: string | undefined, userId: string, accessCardId: string) =>
		flow.changeStatus(userId, () =>
			client.mutate.updateConferenceParticipantStatus({
				__args: { accessCardId, id: statusId, conferenceId: routeParams.conferenceId, userId },
				id: true,
				accessCardId: true
			})
		);

	/** Writes the access card and attendance; whether anything was written. */
	async function performSave(save: AccessFlowSave) {
		if (save.accessCardId) await saveAccessCard(save.statusId, save.userId, save.accessCardId);
		if (save.occasion) {
			await client.mutate.createAttendanceEntry({
				__args: {
					userId: save.userId,
					conferenceId: routeParams.conferenceId,
					occasion: save.occasion
				},
				id: true
			});
		}
		return savesAnything(save);
	}

	const saveAndNext = () =>
		flow.runExclusive(async () => {
			const save = planAccessFlowSave(flow.data, accessCardInput, $occasion);
			if (!save) {
				toast.error(m.userNotFound());
				return;
			}
			if (await performSave(save)) toast.success(m.accessFlowSaved());

			// Close drawer and reset for next participant
			resetView();
		});

	const saveIdentityField = async (
		field: 'givenName' | 'familyName' | 'birthday',
		value: string
	) => {
		const userDetails = flow.data?.user;
		if (!userDetails) return;

		const promise = client.mutate.updateUsersIdentityInfo({
			__args: { id: userDetails.id, ...identityUpdate(field, value) },
			id: true,
			givenName: true,
			familyName: true,
			birthday: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;

		await flow.load(userDetails.id);
	};

	const resetView = () => {
		flow.reset();
		accessCardInput = '';
	};
</script>

<ScanFlowPage
	{flow}
	conferenceId={routeParams.conferenceId}
	title={m.accessFlow()}
	barcodeFormats={['data_matrix', 'code_128']}
	persistKey="useCameraForAccessFlow"
	notFoundMessage={m.userNotFoundForAccessFlow()}
	drawerTitle={m.identityCheck()}
	drawerIcon="fa-id-badge"
	confirmLabel={m.saveAndNext()}
	onConfirm={saveAndNext}
	onClose={resetView}
>
	{#snippet description()}
		{m.accessFlowDescription()}
	{/snippet}

	{#snippet header()}
		<!-- Session-wide occasion input -->
		<FormFieldset title={m.occasionForSession()}>
			<input class="input w-full" type="text" bind:value={$occasion} placeholder={m.occasion()} />
		</FormFieldset>
	{/snippet}

	{#snippet children(userDetails)}
		<!-- Identity section: Flag + Name + Birthday + Badges -->
		<ParticipantRoleSummary conferenceId={routeParams.conferenceId} userId={userDetails.id}>
			<!-- Name display (large, editable) -->
			<div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
				<div class="flex-1">
					<EditableIdentityField
						initialValue={userDetails.givenName ?? ''}
						fullWidth
						onSave={(value) => saveIdentityField('givenName', value)}
					>
						<span class="text-3xl font-bold">{userDetails.givenName}</span>
					</EditableIdentityField>
				</div>
				<div class="flex-1">
					<EditableIdentityField
						initialValue={userDetails.familyName ?? ''}
						fullWidth
						onSave={(value) => saveIdentityField('familyName', value)}
					>
						<span class="text-3xl font-bold">{userDetails.familyName}</span>
					</EditableIdentityField>
				</div>
			</div>

			<!-- Birthday display (large, editable) -->
			<div>
				<EditableIdentityField
					type="date"
					initialValue={userDetails.birthday
						? new Date(userDetails.birthday).toISOString().split('T')[0]
						: ''}
					onSave={(value) => saveIdentityField('birthday', value)}
				>
					<i class="fa-duotone fa-cake-candles text-xl"></i>
					<span class="text-xl">
						{userDetails.birthday
							? new Date(userDetails.birthday).toLocaleDateString('de', {
									dateStyle: 'long'
								})
							: '—'}
					</span>
				</EditableIdentityField>
			</div>
		</ParticipantRoleSummary>

		<!-- Access Card ID Section -->
		<FormFieldset title={m.accessCardId()}>
			<input
				class="input input-lg w-full"
				bind:this={accessCardInputElem}
				bind:value={accessCardInput}
				type="text"
				placeholder={m.accessCardId()}
				onkeydown={(e) => {
					if (e.key === 'Enter') saveAndNext();
				}}
			/>
		</FormFieldset>
	{/snippet}
</ScanFlowPage>
