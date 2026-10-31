<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** Delegations with more than one member after the switch */
		pickers: { delegationId: string; label: string; members: { id: string; name: string }[] }[];
		/** Chosen head delegate member id per delegation id */
		heads: Record<string, string>;
	}

	let { pickers, heads = $bindable() }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<div>
		<h3 class="font-bold">{m.seatSwitchHeadDelegates()}</h3>
		<p class="text-sm opacity-70">{m.seatSwitchHeadDelegatesHint()}</p>
	</div>
	{#each pickers as picker (picker.delegationId)}
		<fieldset class="fieldset bg-base-200 rounded-box p-3">
			<legend class="fieldset-legend">{picker.label}</legend>
			{#each picker.members as member (member.id)}
				<label class="label cursor-pointer gap-2">
					<input
						type="radio"
						class="radio radio-sm"
						name="head-{picker.delegationId}"
						checked={heads[picker.delegationId] === member.id}
						onchange={() => (heads = { ...heads, [picker.delegationId]: member.id })}
					/>
					{member.name}
				</label>
			{/each}
		</fieldset>
	{/each}
</div>
