<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Audience, AudienceType } from '#lib/guide/outline';
	import { audienceOf, toggleRole } from '#lib/guide/outlineEditing';

	/** Who sees a section or an entry; custom roles one by one. */
	interface Props {
		value: Audience | undefined;
		roles: readonly { id: string; name: string }[];
		/** An entry may leave it to its section. */
		optional?: boolean;
		label: string;
		onChange: (audience: Audience | undefined) => void;
	}

	let { value, roles, optional = false, label, onChange }: Props = $props();

	const TYPES: { type: AudienceType; label: () => string }[] = [
		{ type: 'everyone', label: () => m.guideAudienceEveryone() },
		{ type: 'delegates', label: () => m.guideAudienceDelegates() },
		{ type: 'nonStateActors', label: () => m.guideAudienceNonStateActors() },
		{ type: 'customRoles', label: () => m.guideAudienceCustomRoles() },
		{ type: 'supervisors', label: () => m.guideAudienceSupervisors() }
	];

	function pick(type: string) {
		const found = TYPES.find((option) => option.type === type);
		if (!found) return onChange(undefined);
		onChange(
			audienceOf({ type: found.type, current: value, roleIds: roles.slice(0, 1).map((r) => r.id) })
		);
	}

	const toggle = (roleId: string, on: boolean) =>
		onChange(toggleRole({ audience: value, roleId, on }));
</script>

<div class="flex flex-col gap-1">
	<select
		class="select select-sm"
		aria-label={label}
		value={value?.type ?? ''}
		onchange={(event) => pick(event.currentTarget.value)}
	>
		{#if optional}<option value="">{m.guideAudienceInherit()}</option>{/if}
		{#each TYPES as option (option.type)}
			<option value={option.type} disabled={option.type === 'customRoles' && roles.length === 0}>
				{option.label()}
			</option>
		{/each}
	</select>
	{#if value?.type === 'customRoles'}
		<div class="flex flex-wrap gap-2 text-sm">
			{#each roles as role (role.id)}
				<label class="label cursor-pointer gap-1">
					<input
						type="checkbox"
						class="checkbox checkbox-xs"
						checked={value.roleIds.includes(role.id)}
						onchange={(event) => toggle(role.id, event.currentTarget.checked)}
					/>
					{role.name}
				</label>
			{/each}
		</div>
	{/if}
</div>
