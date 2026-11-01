<script lang="ts">
	import { FieldErrors } from 'formsnap';

	/**
	 * The error list of the surrounding `Field`, in DaisyUI's validator styling.
	 *
	 * Formsnap owns the wiring: the container gets the id the control points at through
	 * `aria-describedby` plus `aria-live`, so a validation error is announced instead of only
	 * appearing. Renders nothing visible while the field is valid.
	 */
</script>

<FieldErrors class="validator-hint">
	{#snippet children({ errors, errorProps })}
		{#each errors as error, errorIndex (errorIndex)}
			<span {...errorProps} class="text-error">{error}</span>
		{/each}
	{/snippet}
</FieldErrors>
