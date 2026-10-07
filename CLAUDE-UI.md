# UI Design Guide

This document provides guidance for building consistent user interfaces in MUNify DELEGATOR. Follow these patterns to maintain visual consistency and leverage existing components.

> **Maintenance Note**: Keep this guide updated when creating new UI components, modifying existing component APIs/props, changing usage patterns, or deprecating components. Documentation should always reflect the current state of `src/lib/components/`.

## Design Principles

1. **Consistency First**: Match existing patterns in the codebase before inventing new ones
2. **DaisyUI Native**: Prefer standard DaisyUI components and utilities over custom solutions
3. **Minimal & Clean**: Favor simplicity, whitespace, and clear visual hierarchy
4. **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect` for reactivity (never legacy stores)

## Component Library Overview

Components are located in `src/lib/components/`.

**Naming convention**: directories are `camelCase`, component files are `PascalCase`
(e.g. `tanStackTable/ui/ManagedTable.svelte`). This matches munify-chase.

Key directories:

- `calendar/` - Conference calendar display (day views, time markers, entry cards)
- `form/` - Form inputs integrated with sveltekit-superforms
- `dashboard/` - Dashboard section layouts and widgets
- `dataTable/` - Searchable, sortable data tables
- `navMenu/` - Sidebar navigation components
- `tabs/` - Tab navigation
- `delegationStats/` - Statistics display widgets
- `infoGrid/` - Key-value pair display grids
- `charts/` - ECharts-based visualizations
- `paperHub/` - Paper management components including statistics
- `survey/` - Survey answer modal and compact survey cards for the dashboard

Route-local components that set a pattern are documented below as well (e.g. [Seat Planning](#seat-planning-matrix--hints-sidebar)).

---

## DetailedPaperStats Component

`src/lib/components/paperHub/DetailedPaperStats.svelte`

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
	import DetailedPaperStats from '$lib/components/paperHub/DetailedPaperStats.svelte';

	// allPapers: flat array of all papers across committees
	// committeesWithPapers: array of committees with their papers grouped
	let { allPapers, committeesWithPapers } = $props();
</script>

{#if allPapers.length > 0}
	<DetailedPaperStats {allPapers} {committeesWithPapers} />
{/if}
```

### Chart Subcomponents

This component uses the following chart components from `$lib/components/charts/echarts/`:

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

Components in `src/lib/components/teamManagement/` for managing team invitations.

### InviteTeamMembersModal

`src/lib/components/teamManagement/InviteTeamMembersModal.svelte`

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
	import InviteTeamMembersModal from '$lib/components/teamManagement/InviteTeamMembersModal.svelte';

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

`src/lib/components/teamManagement/PendingInvitationsTable.svelte`

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
	import PendingInvitationsTable from '$lib/components/teamManagement/PendingInvitationsTable.svelte';
</script>

<PendingInvitationsTable invitations={data.pendingInvitations} />
```

#### Features

- Displays email, role, status (account exists/new user), expiration date, and inviter
- Expiration status highlighting (expired invitations shown with reduced opacity)
- Actions: copy invitation link, resend email, revoke invitation
- Automatic cache invalidation after actions

---

## Calendar Components

Components in `src/lib/components/calendar/` for displaying conference calendar schedules.

### CalendarDisplay

`src/lib/components/calendar/CalendarDisplay.svelte`

Main calendar container that renders day tabs (small screens) or side-by-side columns (3xl+). Handles day selection, track filtering, and entry click → drawer.

#### Props Interface

```typescript
interface Props {
	days: Day[]; // Array of calendar days with tracks and entries
	timezone?: string; // IANA timezone (default: 'UTC') — controls "now" marker and today detection
}
```

#### Usage Example

```svelte
<script lang="ts">
	import CalendarDisplay from '$lib/components/calendar/CalendarDisplay.svelte';
</script>

<CalendarDisplay days={previewDays} timezone="Europe/Berlin" />
```

#### Features

- Responsive layout: tabs on small screens, side-by-side grid on 3xl+
- Automatic "today" tab selection using conference timezone
- Per-day track filtering
- Entry click opens `CalendarEntryDrawer` with details

### CalendarDayView

`src/lib/components/calendar/CalendarDayView.svelte`

Renders a single day's timeline with hour grid, entries positioned by time, and a live "now" marker.

#### Props Interface

```typescript
interface Props {
	dayName: string;
	date: Date;
	tracks: Track[];
	entries: Entry[];
	filterTrackId?: string | null;
	timezone?: string; // Passed to CalendarTimeMarker
	onEntryClick?: (entry: Entry) => void;
}
```

### CalendarTimeMarker

`src/lib/components/calendar/CalendarTimeMarker.svelte`

Displays a red "now" line on the calendar timeline. Uses `Intl.DateTimeFormat` with conference timezone to compute position.

#### Props Interface

```typescript
interface Props {
	startHour: number;
	endHour: number;
	hourHeight: number;
	timezone?: string; // IANA timezone (default: 'UTC')
}
```

### CalendarEntryCard

`src/lib/components/calendar/CalendarEntryCard.svelte`

Renders a single calendar entry as a colored card positioned on the timeline. Shows icon, name, time range, room, and track.

### CalendarEntryDrawer

`src/lib/components/calendar/CalendarEntryDrawer.svelte`

Slide-out drawer showing full entry details including place information, map, and site plan.

---

## Kbd Component

`src/lib/components/Kbd.svelte`

Renders a keyboard shortcut hint with OS-aware modifier formatting. On macOS, replaces modifier names with symbols (`alt` → `⌥`, `shift` → `⇧`, `ctrl` → `⌃`, `enter` → `↵`). On Windows/Linux, keeps text as-is. SSR-safe (defaults to text modifiers).

### Props

| Prop     | Type           | Description                        |
| -------- | -------------- | ---------------------------------- |
| `hotkey` | `string`       | Hotkey string, e.g. `"alt+a"`      |
| `size`   | `'xs' \| 'sm'` | DaisyUI kbd size (default: `'sm'`) |

### Usage Examples

```svelte
<script lang="ts">
	import Kbd from '$lib/components/Kbd.svelte';
</script>

<!-- In a button -->
<button class="btn btn-primary">
	Save <Kbd hotkey="alt+a" />
</button>

<!-- Small size for inline badges -->
<span class="hidden sm:inline-block"><Kbd hotkey="alt+n" size="xs" /></span>

<!-- Compound shortcuts -->
<Kbd hotkey="shift+enter" />
```

---

## Form Components (Critical)

Forms use `sveltekit-superforms` for validation and state management. Always structure forms consistently.

### FormSection (long forms)

For long forms (the profile, the conference settings) group fields with `FormSection` instead:
icon, title and optional `description` on the left, fields on the right, groups separated by a
rule rather than boxed. Lay out related fields side by side with a `grid` inside it.

```svelte
<FormSection title={m.address()} icon="house">...</FormSection>
```

`FormImage` is the image upload (drop zone with preview, replace and discard). It fills the same
`File` field as `FormFile`; pass `storedUrl` to preview what the server already holds.

### FormFieldset (Required for Grouping)

**Always** wrap related form inputs with `FormFieldset` to provide visual grouping:

```svelte
<script lang="ts">
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
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

| Component           | Purpose                         | Key Props                                                                     |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `Form`              | Form wrapper with submit button | `form`, `showSubmitButton`, `action`                                          |
| `FormFieldset`      | Visual grouping with legend     | `title`, `icon` (snippet before the title)                                    |
| `FormTextInput`     | Text/email/password input       | `form`, `name`, `label`, `labelIcon` (snippet), `type`, `step`, `placeholder` |
| `FormTextArea`      | Multi-line text                 | `form`, `name`, `label`                                                       |
| `FormSelect`        | Dropdown select                 | `form`, `name`, `label`, `options`                                            |
| `FormCheckbox`      | Checkbox toggle                 | `form`, `name`, `label`                                                       |
| `FormDateTimeInput` | Date/time picker                | `form`, `name`, `label`                                                       |
| `FormFile`          | File upload                     | `form`, `name`, `label`                                                       |
| `FormSubmitButton`  | Submit with loading state       | `form`, `disabled`, `loading`                                                 |

### Complete Form Example

```svelte
<script lang="ts">
	import Form from '$lib/components/form/Form.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormCheckbox from '$lib/components/form/FormCheckbox.svelte';
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
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';

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

### ActionModal and ConfirmDeleteModal

For a modal that only asks for a confirmation (with or without a few fields), prefer these to a
hand-built `Modal`. Both are always open: render them inside an `{#if}` and close them in
`onClose`, which cancelling and the backdrop call.

```svelte
{#if editing}
	<ActionModal
		title={m.edit()}
		confirmLabel={m.save()}
		loading={saving}
		onConfirm={save}
		onClose={() => (editing = false)}
	>
		<input class="input" bind:value={name} />
	</ActionModal>
{/if}

{#if deleting}
	<ConfirmDeleteModal
		title={m.delete()}
		text={m.reallyDelete()}
		onConfirm={remove}
		onClose={() => (deleting = false)}
	/>
{/if}
```

`ConfirmDeleteModal` tracks its own loading state while `onConfirm` (async) runs. `ActionModal`
also takes `subtitle` (snippet), `confirmClass`, `confirmDisabled`, `bodyClass` and `boxClass`.

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

## TopDrawer Component

Use `TopDrawer` for overlay panels that slide down from the top of the screen. Built on `SlidePanel`. It closes on overlay click, Escape and the close button, and animates out the same way for each. Used in management tool pages (accessFlow, postalRegistration, payments) for showing scanned/searched item details.

### Props

| Prop            | Type                 | Description                                   |
| --------------- | -------------------- | --------------------------------------------- |
| `open`          | `boolean` (bindable) | Controls visibility                           |
| `maxWidth`      | `string`             | Max width class (default: `'max-w-2xl'`)      |
| `title`         | `string`             | Header title text                             |
| `titleIcon`     | `string`             | FontAwesome icon class (e.g. `'fa-id-badge'`) |
| `headerActions` | `Snippet`            | Buttons in header (profile link, close)       |
| `children`      | `Snippet`            | Scrollable content area                       |
| `footer`        | `Snippet`            | Sticky footer with action buttons             |

### TopDrawer Example

```svelte
<script lang="ts">
	import TopDrawer from '$lib/components/TopDrawer.svelte';

	let drawerOpen = $state(false);
</script>

<TopDrawer bind:open={drawerOpen} title="Identity Check" titleIcon="fa-id-badge">
	{#snippet headerActions()}
		<button class="btn btn-ghost btn-sm btn-square" onclick={() => (drawerOpen = false)}>
			<i class="fa-solid fa-xmark text-lg"></i>
		</button>
	{/snippet}

	<p>Scrollable content goes here...</p>

	{#snippet footer()}
		<button class="btn btn-primary flex-1">Save & Next</button>
		<button class="btn btn-error" onclick={() => (drawerOpen = false)}>Close</button>
	{/snippet}
</TopDrawer>
```

**Note:** `TopDrawer` is different from `Drawer` — TopDrawer slides down from the top on `SlidePanel`; Drawer is a right-side slide-out detail panel.

## SlidePanel Component

`$lib/components/SlidePanel.svelte` is the shared base for animated edge panels (`TopDrawer`, the table's `SideDrawer`, `CalendarEntryDrawer`). It is a bits-ui `Dialog` with Svelte transitions, so focus trapping, Escape and overlay click come for free. There is no swipe-to-dismiss (vaul-svelte was removed: it pulled in a second, Svelte 4-era bits-ui). Put `Dialog.Title` / `Dialog.Close` from `bits-ui` inside the content.

| Prop        | Type                           | Description                                |
| ----------- | ------------------------------ | ------------------------------------------ |
| `open`      | `boolean` (bindable)           | Controls visibility                        |
| `direction` | `'top' \| 'right' \| 'bottom'` | Edge it slides in from (default `'right'`) |
| `class`     | `string`                       | Sizing classes: max width/height, rounding |
| `keepFocus` | `boolean`                      | Do not move focus into the panel on open   |
| `children`  | `Snippet`                      | Panel content                              |

---

## BarcodeScanner Component

Use `BarcodeScanner` for pages that need barcode scanning via camera or manual text input. Encapsulates camera management, barcode detection, device switching, and manual input fallback.

### Props

| Prop                | Type                        | Description                                                |
| ------------------- | --------------------------- | ---------------------------------------------------------- |
| `scannedCode`       | `string \| null` (bindable) | The detected/entered code                                  |
| `persistKey`        | `string`                    | localStorage key for camera preference                     |
| `barcodeFormats`    | `BarcodeFormat[]`           | Formats to detect (default: `['data_matrix', 'code_128']`) |
| `manualPlaceholder` | `string`                    | Placeholder for manual input field                         |
| `scanPromptText`    | `string`                    | Prompt shown while camera is scanning                      |
| `cameraZIndex`      | `string`                    | z-index class for camera preview (default: `'z-30'`)       |
| `extraControls`     | `Snippet`                   | Optional controls between camera settings and input        |

### Exposed Methods

- `reset()` — Clears scanned code and restarts camera or refocuses manual input

### BarcodeScanner Example

```svelte
<script lang="ts">
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import { queryParameters } from 'sveltekit-search-params';

	const params = queryParameters({ queryUserId: true });
	let scannerRef: BarcodeScanner;
</script>

<BarcodeScanner
	bind:this={scannerRef}
	bind:scannedCode={params.queryUserId}
	barcodeFormats={['data_matrix', 'code_128']}
	persistKey="useCameraForMyPage"
	manualPlaceholder="Enter code..."
	scanPromptText="Present the barcode..."
/>

<!-- Call scannerRef.reset() after saving to prepare for next scan -->
```

---

## Dashboard Components

Dashboard pages use consistent section layouts.

### DashboardSection

Main section wrapper with icon, title, and description:

```svelte
<script lang="ts">
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
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
- `collapsible`: Boolean to make the section collapsible
- `defaultCollapsed`: Boolean for initial collapsed state
- `collapsed`: Bindable boolean to track/control collapsed state externally
- `headerAction`: Optional snippet for header actions

### DashboardContentCard

Simple card container for content:

```svelte
<script lang="ts">
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
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
	import TodoTable from '$lib/components/dashboard/TodoTable.svelte';
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

## Survey Components

Survey components handle displaying and answering surveys on the participant dashboard.

### SurveySection

Self-fetching dashboard component (like `CalendarSection`) that queries surveys and renders them. Renders nothing if no surveys exist.

**File:** `src/lib/components/dashboard/SurveySection.svelte`

**Props:** `conferenceId: string`, `userId: string`, `conferenceTimezone: string`

**Behavior:**

- Fetches non-hidden, non-draft surveys via its own GraphQL query
- Wraps content in a collapsible `DashboardSection`
- Auto-collapses when all surveys are answered
- Shows pinned selection cards below the section when collapsed (for surveys with `showSelectionOnDashboard`)

### SurveyCard

Compact card for a single survey within the dashboard section.

**File:** `src/lib/components/survey/SurveyCard.svelte`

**Props:**

- `question`: `{ id, title, description, deadline, showSelectionOnDashboard, options: [...] }`
- `answer`: `{ option: { id, title } } | undefined`
- `userId`: string
- `conferenceTimezone`: string

Shows deadline status, title, description, current answer badge, and an "Answer"/"Change answer" button that opens `SurveyAnswerModal`.

### SurveyAnswerModal

Modal for answering or changing a survey answer with radio option cards and capacity indicators.

**File:** `src/lib/components/survey/SurveyAnswerModal.svelte`

**Props:**

- `open`: boolean (bindable)
- `question`: `{ id, title, description, deadline, options: [{ id, title, description, upperLimit, countSurveyAnswers }] }`
- `currentAnswerOptionId`: `string | undefined`
- `userId`: string
- `conferenceTimezone`: string

Locks submission after deadline. Contains its own `updateOneSurveyAnswer` mutation with cache invalidation.

### DeadlineDisplay

Reusable timezone-aware deadline display.

**File:** `src/lib/components/DeadlineDisplay.svelte`

**Props:** `deadline: Date | string`, `conferenceTimezone: string`

Shows an open/closed badge with the deadline formatted in the conference timezone. If the user's local timezone differs, shows their local time below.

---

## Data Display

### ManagedTable

The table of the management pages, built on TanStack Table
(`$lib/components/tanStackTable/ui/ManagedTable.svelte`): sortable, paginated, with a search box
kept in the URL (`?filter=`), an export button and the size / zebra settings. Columns are
`ManagedColumn<Row>` definitions; the accessor is what gets sorted and searched (every term must
occur somewhere in the row, fuzzily, via Fuse), `cell` renders it:

```svelte
<script lang="ts">
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import BadgeCell from '$lib/components/tanStackTable/cells/BadgeCell.svelte';

	const columns: ManagedColumn<Row>[] = [
		{ id: 'name', header: 'Name', accessorFn: (row) => row.name },
		{
			id: 'role',
			header: 'Role',
			accessorFn: (row) => row.role,
			cell: ({ row }) => renderComponent(BadgeCell, { label: row.original.role })
		}
	];
</script>

<ManagedTable
	{columns}
	rows={data}
	columnClasses={{ role: 'text-center' }}
	onRowClick={(row) => handleRowClick(row)}
	isRowSelected={(row) => row.id === selectedId}
/>
```

Cells are Svelte components under `tanStackTable/cells/` (`BadgeCell`, `IconCell`, `IconListCell`,
`AssignmentBadge`, …), never HTML strings. A cell text longer than 24ch is truncated. The first
column has to be an accessor column. `tanStackTable/commonColumns.ts` holds the person-table
columns `nameColumn()`, `appliedColumn()` and `userCardColumn()`; `RegistrationAdminTable` adds the
row-opens-a-drawer behaviour on top.

Extra controls go in the `toolbar` snippet (inside the search row; it gets the table).

**Filters and columns come with the table.** A column opts into filtering with a typed `filter`:
`{ type: 'text' | 'boolean' | 'range' }` or `{ type: 'enum', label?: (value) => string }`, plus an
optional `hint` (shown in the drawer) and `alwaysAvailable` (offered while the column is hidden).
The type picks the control and the filter function, so a column never sets `filterFn` itself. Any
table with a filterable column gets a Filters button, active-filter chips and a filter drawer, and
`defaultFilters` is what it opens with (and what the drawer's reset returns to). Every table gets a Columns drawer: `defaultVisible` says what shows
before anyone configures it, `group` and `groupOrder` sort the drawers into sections,
`description` explains a column, and `storageKey` remembers the choice in the browser.

**The table's state lives in the URL**, so a copied link shows the same table: `?filter=` (the
search, or `queryParamKey`), `filters=` (JSON; `[]` is "no filters", a missing parameter is the
defaults), `sort=family_name,-email` (`none` for no sorting), `columns=` (the shown column ids),
`page=` and `size=`. A parameter is dropped again when the value equals what the page would show
anyway. The codecs are in `managedTable.ts`, the sync is `sveltekit-search-params`. The size and
zebra settings are personal preferences kept per browser and are not part of the link.

**Export** (CSV, JSON, print) is built into the table from the shown columns and every row the
filters let through, in sort order. A column exports its accessor's value as text (booleans as
Ja/Nein, dates formatted); give it `exportValue: (row) => string` when the cell shows something
else, such as a translated enum. A column with neither accessor nor `exportValue` (an actions
column) is not exported.

While a search is active the table drops its sorting so the best match comes first; clearing the
search brings `initialSorting` back.

**Client mode vs. server mode.** Without `tableState` the table holds every row and searches
(Fuse), filters, sorts and pages them in the browser - only right for a few hundred rows (an
upload, a conference's schools). **Any table over registrations, people or applications runs in
server mode**, where the backend does the work:

```svelte
<script lang="ts">
	const tableState = createTableState(); // $lib/components/tanStackTable/tableState.svelte
	const page = $derived(await fetchThingsPage(conferenceId, tableState)); // thingsQuery.ts
</script>

<ManagedTable {columns} rows={page.rows} {tableState} rowCount={page.total} {exportRows} />
```

`createTableState` owns the URL state (`search` is the typed text once typing paused 250 ms;
`sorting`, `columnFilters`, `pagination`). The page's `*Query.ts` turns it into rumble arguments
with the helpers of `tanStackTable/serverQuery.ts`: `pageArgs` (asks for one row more than a page),
`pageOf` (splits that row off into `hasMore`), `orderFrom` (sorting to `orderBy`, with a tiebreaker),
`searchWords` / `containing` / `personContains` (every word has to occur somewhere: `ilike` over the
columns and the related people), `stringFilter` / `booleanFilter` / `enumFilter` / `rangeFilter`
(the filter drawer's values to `where`). `exportRows` fetches every matching row with
`fetchEveryRow`. The total comes from the entity's rumble count query (`countQuery({ table })` in
its handler, e.g. `delegationsCount(where)`, same `where` as the page, wrapped in `asCount`) and goes
to the table as `rowCount`: it gives the pager its page count and last-page button; without it the
pager only knows `hasMore`. `*Query.ts` next to the page is the model: `management/delegations/`.

What the backend cannot do, the table does not offer: `orderBy` only reaches a row's own columns
(not the person's name behind a relation), and computed values (codenames, translated nation names

- search sends `nationCodesMatching(term)` instead - member counts) cannot be sorted or filtered.
  Such a column sets `enableSorting: false`; an enum filter in server mode gives its `options`
  (the drawer cannot count values it has not loaded).

### CollapsibleCard

A card whose header toggles its body, with an optional `badge` snippet at the header's end:

```svelte
<CollapsibleCard icon="users" title={m.members()} bind:expanded>
	{#snippet badge()}<span class="badge">{count}</span>{/snippet}
	<MemberList {delegationId} />
</CollapsibleCard>
```

### LoadState

`<LoadState {loading} {error}>…</LoadState>` shows a spinner while `loading`, the error once one
occurred, and its children otherwise - for state a component loads by hand rather than through an
awaited `$derived`.

### DelegationStats

Statistics widgets using DaisyUI stats component:

```svelte
<script lang="ts">
	import GenericWidget from '$lib/components/delegationStats/GenericWidget.svelte';
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
	import Grid from '$lib/components/infoGrid/Grid.svelte';
	import Entry from '$lib/components/infoGrid/Entry.svelte';
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

## Seat Planning (Matrix + Hints Sidebar)

The seat planning page (`src/routes/(authenticated)/dashboard/[conferenceId]/management/seat-planning/`) is the reference for two patterns: a large editable matrix with live (optimistic) writes, and a sidebar of hints computed from the same state.

### Structure

| File                                          | Role                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seatPlanner.svelte.ts`                       | `SeatPlanner` class: derived seat state, optimistic updates, undo toast, lock lookups                                                                                                                                                                                                                                                        |
| `SeatMatrix.svelte` / `SortableHeader.svelte` | Pinned table on the shared `DataTable.Root` shell (`$lib/components/tanStackTable/ui`: scroll container, zebra and size from the table settings; `SortButton` is the shared sort header button), every column sortable (`sortSeatRows`), totals in `<tfoot>`. Only the first column may be a `th`: `table-pin-cols` pins every `th` of a row |
| `SeatMatrixRow.svelte` / `SeatCell.svelte`    | One row per state, one toggle button per committee; locked cells render a lock with a tooltip                                                                                                                                                                                                                                                |
| `SeatMatrixFilters.svelte` / `filters.ts`     | Filters and sorting persisted in the URL via `queryParameters` (shared with the sidebar)                                                                                                                                                                                                                                                     |
| `HintsSidebar.svelte` + `hints/*`             | Sidebar sections; each section is its own component. `RegionalBalanceHints` draws diverging seat bars per committee (`RegionalDeviationBars`) against the committee's baseline, set in `RegionalBaselineModal` (UN 193, HRC, ECOSOC, Security Council or manual targets)                                                                     |
| `CountryInfoPopover.svelte`                   | Native `popover="auto"`, positioned `fixed` next to the clicked name, so the scroll container cannot clip it                                                                                                                                                                                                                                 |
| `sizeLimits.svelte.ts`                        | Per-browser settings in `localStorage`, loaded in an `$effect` (never during SSR)                                                                                                                                                                                                                                                            |

### Rules

- **Logic lives in pure functions** in `src/lib/helpers/seatPlanning/` (`baselines.ts`, `hints.ts`, `sortRows.ts`, `unMembers.ts`) and is unit tested next to them. Components only render their results.
- **Optimistic writes**: the class keeps pending changes in a `SvelteMap` and overlays them on the live query results. The mutation returns the changed committee with its nations, so the cache updates without a refetch, and the committee's publish reaches every other open matrix. On error the pending entry is dropped and the server's message is toasted.
- **Set, don't toggle**: mutations take the target state (`enabled: true/false`) so concurrent clicks converge.
- **Undo**: success toasts carry an action that sends the inverse mutation (`toast.success(msg, { action: { label: m.undo(), onClick } })`).
- **Sidebar → matrix**: hints that point at rows (a size, a regional group) set the shared URL filters instead of keeping their own state.

```svelte
<script lang="ts">
	const planner = new SeatPlanner(() => ({ committees, nonStateActors, assignments }));
</script>

<div class="flex min-h-0 grow flex-col gap-4 xl:flex-row">
	<div class="min-h-0 min-w-0 grow"><SeatMatrix {planner} {committees} {sizeLimits} /></div>
	<aside class="shrink-0 overflow-y-auto xl:w-80">
		<HintsSidebar {planner} {committees} {nonStateActors} {sizeLimits} />
	</aside>
</div>
```

Hint sections use soft alerts: `alert alert-warning alert-soft` for rule violations, `alert-info alert-soft` for suggestions, `alert-error alert-soft` for hard limits.

---

## Assignment Board

`src/routes/(authenticated)/dashboard/[conferenceId]/management/assignment/` is a tabbed area
(Sichtung, Gewichtung, Einzelteilnehmende, Zuteilung, Abschluss), one child route per tab, with the
tabs and a `DraftStatus` badge (pending changes, released or not) in `+layout.svelte`.

| File                                      | Role                                                                                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `board.ts`                                | `fetchAssignmentBoard` / `fetchAssignmentRoles` (live), `boardState` (groups, seats, occupancy via `$lib/assignment`), `describeRole`                                                                 |
| `GroupCard.svelte`                        | A draggable group (delegation, split part, converted single): rating, flags, wish rank of its role, pending marker, split/unassign                                                                    |
| `RoleCard.svelte`                         | A drop zone for a nation, non-state actor or custom role: seats taken / total, its groups, free slots, over-capacity in red                                                                           |
| `SplitModal.svelte`                       | Splits a delegation by picking a part per member (radio grid, no drag and drop)                                                                                                                       |
| `assignGroup.ts`                          | Plans a role for a group: whole delegations through `assignDelegation`, parts and converted singles through their unit                                                                                |
| `sighting/ApplicationCard.svelte`         | One application with its people, texts and wishes; `ReviewControls` rate, flag, disqualify and annotate it                                                                                            |
| `sighting/+page.svelte`, `DeckNav.svelte` | The deck is the backend's (`sightingDeck`: filtered, ordered, a window around the card plus totals and the cards to step to); a card is read on its own, search and school filter ask the backend too |

- Drag and drop uses `@thisux/sveltednd` (`draggable` with `dragData: { id: group.key }`, `droppable`
  containers named `pool`, `role:<key>`); every drop is one draft mutation, and the live queries
  bring the result back - there is no local copy of the draft.
- **A page that awaits (`$derived(await …)`) must not read route params or URL state inside that
  derived.** A navigation - the table's or the sighting's own URL writes are one - hands the page
  fresh `params`, which re-ran the derived from the state a still-pending batch showed: the card
  stayed on the previous one. Pull the id into its own `$derived`, hold what the query depends on
  in `$state` and write it to the URL, and create `createTableState` / `queryParameters` before the
  first `await` (afterwards a server render has no request to read the URL of). Rumble rejects an
  empty `AND`: use `allOf`. The client cache answers a request with unchanged variables, so a
  refetch after a save has to change one (see `revision` of `sightingDeck`).
- Cards keyed by props that come from live data pull their keys into their own `$derived` before
  querying (`ApplicationCard`), or a rebuilt parent list re-runs their queries in a loop.
- `$lib/components/assignment/AssignmentReleaseToggle.svelte` is the release switch; it saves on
  its own and appears both on the finish tab and in the conference settings.
- `$lib/components/AssignmentPending.svelte` is what participants and supervisors see between the
  end of registration and the release, in place of `ApplicationRejected`.

---

## Navigation Components

## App Shell

The signed-in area (`routes/(authenticated)/`) has **one** global navigation: a sticky top bar
(`AuthenticatedHeader.svelte`) inside a centered `max-w-[1400px]` container, which the page content
shares.

- **Wordmark** (`MUNify DELEGATOR`) links to `/dashboard`, the conference selector.
- **Breadcrumbs** follow it. The conference crumb is `ConferenceSwitcher.svelte`, a dropdown that
  names the current conference and switches to another; there is no conference list elsewhere.
- **Avatar menu** (`UserMenu.svelte`): name and email, my account, feedback, logout, language. It
  holds no navigation.
- A thin strip on top of the bar marks impersonation (yellow) and the dev server (red).

The dashboard has no sidebar. Only the management and team-management areas add one, through
`SideNavigationDrawer` (directly, or via `ConferenceSidebarLayout`): a menu that is always fully shown on
desktop (a drawer behind the top bar's burger on mobile) for the many pages of that area, with no logo and no back/dashboard/home buttons - the top bar covers those.

### NavMenu

Sidebar navigation:

```svelte
<script lang="ts">
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/navMenu/NavMenuDetails.svelte';
</script>

<NavMenu>
	<NavMenuButton title="Dashboard" href="/dashboard" icon="fa-home" />
	<NavMenuDetails title="Settings" icon="fa-cog">
		<NavMenuButton title="General" href="/settings/general" icon="fa-gear" />
		<NavMenuButton title="Security" href="/settings/security" icon="fa-shield" />
	</NavMenuDetails>
</NavMenu>
```

`NavMenuDetails` is a labelled group whose entries are indented below it; it does not collapse.

### ConferenceSidebarLayout

The layout of a conference area with its own side navigation (team management): pass the menu's entries as the `nav` snippet; it also mounts the user card drawer
those pages open.

### Tabs

Tab navigation:

```svelte
<script lang="ts">
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import Tab from '$lib/components/tabs/Tab.svelte';

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

### OptionalTooltip

`<OptionalTooltip tip={track.description}>…</OptionalTooltip>` wraps its children in a DaisyUI tooltip only
when `tip` is set, and renders them bare otherwise - such as a calendar track that may have a
description.

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

Use `sveltekit-search-params` (v4, runes-based) for URL-persisted state. `queryParameters` returns a
reactive object: read `params.x`, assign `params.x = …` to navigate, and assign `null` to drop the
key. Call it during component init. Name it `params`, and the route prop `routeParams` where both
exist.

```svelte
<script lang="ts">
	import { queryParameters, ssp } from 'sveltekit-search-params';

	const params = queryParameters({ tab: true, page: ssp.number(1) });
	let activeTab = $derived(params.tab ?? 'overview');

	function setTab(tab: string) {
		params.tab = tab;
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
