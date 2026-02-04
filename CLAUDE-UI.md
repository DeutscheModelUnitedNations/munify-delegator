# UI Design Guide

This document provides guidance for building consistent user interfaces in MUNify DELEGATOR. Follow these patterns to maintain visual consistency and leverage existing components.

> **Maintenance Note**: Keep this guide updated when creating new UI components, modifying existing component APIs/props, changing usage patterns, or deprecating components. Documentation should always reflect the current state of `src/lib/components/`.

## Design Principles

1. **Consistency First**: Match existing patterns in the codebase before inventing new ones
2. **DaisyUI Native**: Prefer standard DaisyUI components and utilities over custom solutions
3. **Minimal & Clean**: Favor simplicity, whitespace, and clear visual hierarchy
4. **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect` for reactivity (never legacy stores)

## Component Library Overview

Components are located in `src/lib/components/`. Key directories:

- `Form/` - Form inputs integrated with sveltekit-superforms
- `Dashboard/` - Dashboard section layouts and widgets
- `DataTable/` - Searchable, sortable data tables
- `NavMenu/` - Sidebar navigation components
- `Tabs/` - Tab navigation
- `DelegationStats/` - Statistics display widgets
- `InfoGrid/` - Key-value pair display grids
- `Charts/` - ECharts-based visualizations
- `PaperHub/` - Paper management components including statistics

---

## DetailedPaperStats Component

`src/lib/components/PaperHub/DetailedPaperStats.svelte`

Displays comprehensive paper statistics with multiple charts and gauges for the Paper Hub dashboard.

### Props Interface

```typescript
interface Paper {
	type: PaperType$options; // 'POSITION_PAPER' | 'WORKING_PAPER' | 'INTRODUCTION_PAPER'
	status: PaperStatus$options; // 'DRAFT' | 'SUBMITTED' | 'REVISED' | 'CHANGES_REQUESTED' | 'ACCEPTED'
	versions: Array<{ reviews: Array<{ id: string }> }>;
}

interface CommitteeWithPapers {
	name: string; // Full committee name
	abbreviation: string; // Short committee code (e.g., "GA", "SC")
	papers: Paper[];
}

interface Props {
	allPapers: Paper[];
	committeesWithPapers: CommitteeWithPapers[];
}
```

### Usage Example

```svelte
<script lang="ts">
	import DetailedPaperStats from '$lib/components/PaperHub/DetailedPaperStats.svelte';

	// allPapers: flat array of all papers across committees
	// committeesWithPapers: array of committees with their papers grouped
	let { allPapers, committeesWithPapers } = $props();
</script>

{#if allPapers.length > 0}
	<DetailedPaperStats {allPapers} {committeesWithPapers} />
{/if}
```

### Chart Subcomponents

This component uses the following chart components from `$lib/components/Charts/ECharts/`:

| Component             | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `BarChart`            | Papers by type distribution                |
| `MultiSeriesBarChart` | Status breakdown by paper type (stacked)   |
| `GaugeChart`          | Review progress and acceptance rate gauges |
| `EChartsBase`         | Committee breakdown horizontal bar chart   |

### Features

- Summary stats row (total papers, with/without reviews, accepted)
- Review progress gauge (papers with at least one review)
- Acceptance rate gauge (accepted papers / non-draft papers)
- Papers by type bar chart
- Status by type stacked bar chart
- Committee breakdown with grouped stacked horizontal bars

---

## Team Management Components

Components in `src/lib/components/TeamManagement/` for managing team invitations.

### InviteTeamMembersModal

`src/lib/components/TeamManagement/InviteTeamMembersModal.svelte`

Modal for inviting team members via email. Supports batch email input, status checking, and role assignment.

#### Props Interface

```typescript
interface Props {
	open: boolean; // Controls modal visibility (bindable)
	conferenceId: string; // Conference to invite members to
}
```

#### Usage Example

```svelte
<script lang="ts">
	import InviteTeamMembersModal from '$lib/components/TeamManagement/InviteTeamMembersModal.svelte';

	let inviteModalOpen = $state(false);
</script>

<button class="btn btn-primary" onclick={() => (inviteModalOpen = true)}>
	Invite Team Members
</button>

<InviteTeamMembersModal bind:open={inviteModalOpen} conferenceId={data.conferenceId} />
```

#### Features

- Two-step flow: enter emails → review and assign roles
- Email status checking (existing user, new user, pending invitation, already member)
- Role assignment per invitee (MEMBER, REVIEWER, PARTICIPANT_CARE, TEAM_COORDINATOR, PROJECT_MANAGEMENT)
- External domain warning when inviting non-organization emails
- Batch email parsing with comma/semicolon/newline separators

---

### PendingInvitationsTable

`src/lib/components/TeamManagement/PendingInvitationsTable.svelte`

Table displaying pending team member invitations with actions.

#### Props Interface

```typescript
interface Invitation {
	id: string;
	email: string;
	role: string;
	expiresAt: string;
	userExists: boolean;
	invitedBy: {
		given_name: string;
		family_name: string;
	};
}

interface Props {
	invitations: Invitation[];
}
```

#### Usage Example

```svelte
<script lang="ts">
	import PendingInvitationsTable from '$lib/components/TeamManagement/PendingInvitationsTable.svelte';
</script>

<PendingInvitationsTable invitations={data.pendingInvitations} />
```

#### Features

- Displays email, role, status (account exists/new user), expiration date, and inviter
- Expiration status highlighting (expired invitations shown with reduced opacity)
- Actions: copy invitation link, resend email, revoke invitation
- Automatic cache invalidation after actions

---

## Form Components (Critical)

Forms use `sveltekit-superforms` for validation and state management. Always structure forms consistently.

### FormFieldset (Required for Grouping)

**Always** wrap related form inputs with `FormFieldset` to provide visual grouping:

```svelte
<script lang="ts">
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
</script>

<FormFieldset title="Personal Information">
	<FormTextInput {form} name="firstName" label="First Name" />
	<FormTextInput {form} name="lastName" label="Last Name" />
	<FormTextInput {form} name="email" label="Email" type="email" />
</FormFieldset>

<FormFieldset title="Preferences">
	<FormSelect {form} name="language" label="Language" options={languageOptions} />
</FormFieldset>
```

### Available Form Components

| Component           | Purpose                         | Key Props                                      |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| `Form`              | Form wrapper with submit button | `form`, `showSubmitButton`, `action`           |
| `FormFieldset`      | Visual grouping with legend     | `title`                                        |
| `FormTextInput`     | Text/email/password input       | `form`, `name`, `label`, `type`, `placeholder` |
| `FormTextArea`      | Multi-line text                 | `form`, `name`, `label`                        |
| `FormSelect`        | Dropdown select                 | `form`, `name`, `label`, `options`             |
| `FormCheckbox`      | Checkbox toggle                 | `form`, `name`, `label`                        |
| `FormDateTimeInput` | Date/time picker                | `form`, `name`, `label`                        |
| `FormFile`          | File upload                     | `form`, `name`, `label`                        |
| `FormSubmitButton`  | Submit with loading state       | `form`, `disabled`, `loading`                  |

### Complete Form Example

```svelte
<script lang="ts">
	import Form from '$lib/components/Form/Form.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import FormCheckbox from '$lib/components/Form/FormCheckbox.svelte';
	import { superForm } from 'sveltekit-superforms';

	let { data } = $props();
	const form = superForm(data.form);
</script>

<Form {form}>
	<FormFieldset title="Account Details">
		<FormTextInput {form} name="username" label="Username" placeholder="Enter username" />
		<FormTextInput {form} name="email" label="Email" type="email" />
	</FormFieldset>

	<FormFieldset title="Settings">
		<FormSelect
			{form}
			name="role"
			label="Role"
			options={[
				{ value: 'user', label: 'User' },
				{ value: 'admin', label: 'Admin' }
			]}
		/>
		<FormCheckbox {form} name="notifications" label="Enable notifications" />
	</FormFieldset>
</Form>
```

---

## Modal Component

Use `Modal` for dialogs. It handles backdrop clicks and accessibility.

### Props

| Prop        | Type                 | Description              |
| ----------- | -------------------- | ------------------------ |
| `open`      | `boolean` (bindable) | Controls visibility      |
| `title`     | `string`             | Modal title              |
| `fullWidth` | `boolean`            | Expand to 90% width      |
| `children`  | `Snippet`            | Modal body content       |
| `action`    | `Snippet`            | Footer actions (buttons) |
| `onclose`   | `() => void`         | Callback when closed     |

### Modal Example

```svelte
<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	let modalOpen = $state(false);
</script>

<button class="btn btn-primary" onclick={() => (modalOpen = true)}>Open Modal</button>

<Modal bind:open={modalOpen} title="Edit Item">
	<FormFieldset title="Item Details">
		<label class="form-control w-full">
			<div class="label"><span class="label-text">Name</span></div>
			<input type="text" class="input input-bordered w-full" placeholder="Enter name" />
		</label>
	</FormFieldset>

	{#snippet action()}
		<button class="btn" onclick={() => (modalOpen = false)}>Cancel</button>
		<button class="btn btn-primary" onclick={handleSave}>Save</button>
	{/snippet}
</Modal>
```

### Modal with Superforms

When using superforms inside a modal, integrate the Form component:

```svelte
<Modal bind:open={modalOpen} title="Create Item">
	<Form {form} showSubmitButton={false}>
		<FormFieldset title="Details">
			<FormTextInput {form} name="name" label="Name" />
			<FormTextInput {form} name="description" label="Description" />
		</FormFieldset>
	</Form>

	{#snippet action()}
		<button class="btn" onclick={() => (modalOpen = false)}>Cancel</button>
		<button class="btn btn-primary" onclick={submitForm}>Create</button>
	{/snippet}
</Modal>
```

---

## Drawer Component

Use `Drawer` for slide-out panels (e.g., detail views, edit forms).

### Props

| Prop       | Type                 | Description                    |
| ---------- | -------------------- | ------------------------------ |
| `open`     | `boolean` (bindable) | Controls visibility            |
| `category` | `string`             | Category label                 |
| `title`    | `string`             | Panel title                    |
| `loading`  | `boolean`            | Show loading spinner           |
| `width`    | `string`             | Panel width (default: `34rem`) |
| `onClose`  | `() => void`         | Callback when closed           |

### Drawer Example

```svelte
<script lang="ts">
	import Drawer from '$lib/components/Drawer.svelte';

	let drawerOpen = $state(false);
	let loading = $state(false);
</script>

<button class="btn" onclick={() => (drawerOpen = true)}>View Details</button>

<Drawer bind:open={drawerOpen} category="Delegation" title="Germany" {loading}>
	<div class="flex flex-col gap-4">
		<p>Delegation details go here...</p>
	</div>
</Drawer>
```

---

## Dashboard Components

Dashboard pages use consistent section layouts.

### DashboardSection

Main section wrapper with icon, title, and description:

```svelte
<script lang="ts">
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
</script>

<DashboardSection
	icon="users"
	title="Team Members"
	description="Manage your conference team"
	variant="default"
>
	<!-- Section content -->
</DashboardSection>
```

**Props:**

- `icon`: FontAwesome icon name (without `fa-` prefix)
- `title`: Section heading
- `description`: Optional subtitle
- `variant`: `"default"` | `"info"` (info uses blue styling)
- `headerAction`: Optional snippet for header actions

### DashboardContentCard

Simple card container for content:

```svelte
<script lang="ts">
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
</script>

<DashboardContentCard title="Statistics" description="Overview of current data">
	<p>Card content here...</p>
</DashboardContentCard>
```

### ConferenceHeader

Conference title header with emblem and status:

```svelte
<ConferenceHeader
	title={conference.title}
	longTitle={conference.longTitle}
	state={conference.state}
	startDate={conference.startConference}
	endDate={conference.endConference}
	emblemDataURL={conference.emblemDataURL}
/>
```

### TodoTable

Checklist table with status icons:

```svelte
<script lang="ts">
	import TodoTable from '$lib/components/Dashboard/TodoTable.svelte';
</script>

<TodoTable
	todos={[
		{ title: 'Complete registration', completed: true },
		{ title: 'Upload photo', completed: false, help: 'Required for badge' },
		{ title: 'Pay fees', completed: undefined } // Shows loading spinner
	]}
/>
```

---

## Data Display

### DataTable

Searchable, sortable table with optional row expansion:

```svelte
<script lang="ts">
	import DataTable from '$lib/components/DataTable/DataTable.svelte';

	const columns = [
		{ key: 'name', title: 'Name', value: (row) => row.name, sortable: true },
		{ key: 'email', title: 'Email', value: (row) => row.email }
	];
</script>

<DataTable
	{columns}
	rows={data}
	enableSearch={true}
	sortBy="name"
	rowSelected={(row) => handleRowClick(row)}
/>
```

With expandable rows:

```svelte
<DataTable {columns} rows={data} showExpandIcon={true}>
	{#snippet expandedRowContent(row)}
		<div class="p-4">
			<p>Expanded content for {row.name}</p>
		</div>
	{/snippet}
</DataTable>
```

### DelegationStats

Statistics widgets using DaisyUI stats component:

```svelte
<script lang="ts">
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
</script>

<GenericWidget
	content={[
		{ icon: 'users', title: 'Total Members', value: 42, desc: '+5 this week' },
		{ icon: 'check-circle', title: 'Confirmed', value: 38 },
		{ icon: 'clock', title: 'Pending', value: 4 }
	]}
/>
```

### InfoGrid

Key-value pair display:

```svelte
<script lang="ts">
	import Grid from '$lib/components/InfoGrid/Grid.svelte';
	import Entry from '$lib/components/InfoGrid/Entry.svelte';
</script>

<Grid>
	<Entry title="Name" fontAwesomeIcon="user" content="John Doe" />
	<Entry title="Email" fontAwesomeIcon="envelope" content="john@example.com" />
	<Entry title="Status" fontAwesomeIcon="circle-check">
		<span class="badge badge-success">Active</span>
	</Entry>
</Grid>
```

---

## Navigation Components

### NavMenu

Sidebar navigation:

```svelte
<script lang="ts">
	import NavMenu from '$lib/components/NavMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/NavMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/NavMenu/NavMenuDetails.svelte';

	let expanded = $state(true);
</script>

<NavMenu>
	<NavMenuButton title="Dashboard" href="/dashboard" icon="fa-home" bind:expanded />
	<NavMenuDetails title="Settings" icon="fa-cog">
		<NavMenuButton title="General" href="/settings/general" icon="fa-gear" bind:expanded />
		<NavMenuButton title="Security" href="/settings/security" icon="fa-shield" bind:expanded />
	</NavMenuDetails>
</NavMenu>
```

### Tabs

Tab navigation:

```svelte
<script lang="ts">
	import Tabs from '$lib/components/Tabs/Tabs.svelte';
	import Tab from '$lib/components/Tabs/Tab.svelte';

	let activeTab = $state('overview');
</script>

<Tabs>
	<Tab
		title="Overview"
		icon="chart-pie"
		active={activeTab === 'overview'}
		onclick={() => (activeTab = 'overview')}
	/>
	<Tab
		title="Members"
		icon="users"
		active={activeTab === 'members'}
		onclick={() => (activeTab = 'members')}
	/>
</Tabs>

{#if activeTab === 'overview'}
	<!-- Overview content -->
{:else if activeTab === 'members'}
	<!-- Members content -->
{/if}
```

---

## Status Indicators

### StatusLight

Colored status indicator with optional blink:

```svelte
<script lang="ts">
	import StatusLight from '$lib/components/StatusLight.svelte';
</script>

<StatusLight color="success" blink={true} tooltip="Online" />
<StatusLight color="warning" blink={false} tooltip="Pending" />
<StatusLight color="error" blink={false} tooltip="Offline" />
```

**Colors**: `success`, `warning`, `error`, `info`
**Sizes**: `xs`, `sm`, `md`, `lg`, `xl`

### Badges

Use DaisyUI badges for status labels:

```svelte
<span class="badge badge-success">Active</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-error">Rejected</span>
<span class="badge badge-info">New</span>
<span class="badge badge-neutral">Archived</span>
```

---

## Icons

Use FontAwesome Duotone icons throughout the application:

```svelte
<!-- Regular duotone icon -->
<i class="fa-duotone fa-user"></i>

<!-- Solid version for active states -->
<i class="fas fa-user"></i>

<!-- With size -->
<i class="fa-duotone fa-user text-2xl"></i>

<!-- With color -->
<i class="fa-duotone fa-check text-success"></i>
<i class="fa-duotone fa-times text-error"></i>
```

---

## Color & Theming

Use DaisyUI semantic color classes:

### Background Colors

- `bg-base-100` - Primary background
- `bg-base-200` - Secondary/muted background
- `bg-base-300` - Tertiary/hover background

### Text Colors

- `text-base-content` - Primary text
- `text-base-content/60` - Muted text
- `text-primary` - Primary accent
- `text-secondary` - Secondary accent

### Status Colors

- `text-success` / `bg-success` - Success/positive
- `text-warning` / `bg-warning` - Warning/caution
- `text-error` / `bg-error` - Error/danger
- `text-info` / `bg-info` - Information

### Borders

- `border-base-200` - Light border
- `border-base-300` - Medium border

---

## Layout Patterns

### Page Container

For centered content pages:

```svelte
<div class="flex w-full flex-col items-center">
	<div class="w-full max-w-4xl">
		<!-- Page content -->
	</div>
</div>
```

### Dashboard Layout

For dashboard pages with multiple sections:

```svelte
<div class="flex w-full flex-col gap-10">
	<ConferenceHeader ... />
	<DashboardSection ...>
		<!-- Section 1 content -->
	</DashboardSection>
	<DashboardSection ...>
		<!-- Section 2 content -->
	</DashboardSection>
</div>
```

### Card Grid

For card-based layouts:

```svelte
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	<div class="card bg-base-100 border border-base-200 shadow-sm">
		<div class="card-body">
			<!-- Card content -->
		</div>
	</div>
</div>
```

---

## Common Patterns

### Loading States

```svelte
<!-- Spinner -->
<span class="loading loading-spinner loading-md"></span>

<!-- Skeleton -->
<div class="skeleton h-4 w-full"></div>

<!-- Loading dots -->
<span class="loading loading-dots loading-sm"></span>
```

### Empty States

```svelte
<div class="flex flex-col items-center justify-center py-12 text-center">
	<i class="fa-duotone fa-inbox text-4xl text-base-content/30 mb-4"></i>
	<p class="text-base-content/60">No items found</p>
</div>
```

### Action Buttons

```svelte
<!-- Primary action -->
<button class="btn btn-primary">Save</button>

<!-- Secondary action -->
<button class="btn btn-ghost">Cancel</button>

<!-- Danger action -->
<button class="btn btn-error">Delete</button>

<!-- Icon button -->
<button class="btn btn-square btn-ghost btn-sm">
	<i class="fa-duotone fa-pencil"></i>
</button>
```

---

## URL State Management

Use `sveltekit-search-params` for URL-persisted state:

```svelte
<script lang="ts">
	import { queryParam } from 'sveltekit-search-params';

	const tabParam = queryParam('tab');
	let activeTab = $derived($tabParam ?? 'overview');

	function setTab(tab: string) {
		$tabParam = tab;
	}
</script>
```

---

## Checklist for New UI Features

Before implementing new UI:

1. Check if a component already exists in `src/lib/components/`
2. Use `FormFieldset` for all form groupings
3. Use DaisyUI classes before writing custom CSS
4. Use semantic color classes (not hardcoded colors)
5. Include loading and empty states
6. Test responsive behavior (mobile-first)
7. Add proper aria labels for accessibility
8. Use the `$t()` function from Paraglide-JS for all user-facing text (i18n)
