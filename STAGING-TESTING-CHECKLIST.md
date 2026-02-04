# Staging Testing Checklist

This checklist covers functionality affected by recent changes. Test each item systematically.

---

## 1. Team Member Invitation System (Magic Link Authentication)

### 1.1 Accessing Team Management
- [ ] TEAM_COORDINATOR can access `/dashboard/[conferenceId]/team-management/`
- [ ] PROJECT_MANAGEMENT can access team management routes
- [ ] Non-coordinators receive 403 error when accessing team management
- [ ] Navigation links appear in dashboard for authorized roles

### 1.2 Invite Team Members Modal
- [ ] Modal opens from team management page
- [ ] Email input accepts valid email addresses
- [ ] Invalid email formats are rejected with error message
- [ ] Duplicate emails in batch input are deduplicated
- [ ] CSV paste/input with multiple emails works correctly
- [ ] Whitespace in emails is trimmed properly
- [ ] Role selection dropdown works (TEAM_COORDINATOR, PROJECT_MANAGEMENT, etc.)

### 1.3 Email Status Checking
- [ ] **Existing user**: Shows "exists" status, user will be added directly
- [ ] **New user**: Shows "new_user" status, magic link will be sent
- [ ] **Pending invitation**: Shows "pending_invitation" status with warning
- [ ] **Already member**: Shows "already_member" status, cannot re-invite
- [ ] Mixed statuses in single batch display correctly

### 1.4 Organization Domain Validation
- [ ] Emails outside `PUBLIC_TEAM_ORGANIZATION_DOMAIN` show warning
- [ ] Warning is informational only, does not block invitation
- [ ] Missing domain config handles gracefully (no crash)

### 1.5 Invitation Sending
- [ ] Invitations created successfully for new users
- [ ] Existing users added directly to team (no magic link)
- [ ] Invitation email sent with correct magic link URL
- [ ] Welcome email sent to existing users added directly
- [ ] Email contains correct conference name and role

### 1.6 Magic Link Flow
- [ ] `/auth/accept-invitation?token=...` loads correctly
- [ ] Valid token: Shows invitation details, prompts to continue
- [ ] Invalid token: Shows error message
- [ ] Expired token (>7 days): Shows expiry error with option to request new
- [ ] Already used token: Shows "already accepted" message
- [ ] Revoked token: Shows error message
- [ ] Clicking continue initiates OIDC login
- [ ] After OIDC login, user becomes team member
- [ ] Token marked as used after successful acceptance

### 1.7 Pending Invitations Management
- [ ] Table shows all pending invitations with email, role, sent date
- [ ] **Revoke**: Invitation becomes unusable, removed from pending list
- [ ] **Regenerate**: New token generated, expiry reset, old token invalid
- [ ] **Resend**: Email re-sent with same or regenerated token
- [ ] Expired invitations shown with visual indicator

### 1.8 Team Member Management
- [ ] Team members list shows all current members
- [ ] Profile completeness indicator visible for incomplete profiles
- [ ] Delete team member: Confirmation dialog appears
- [ ] Delete team member: Member removed from team
- [ ] Impersonation: Only available to OIDC admins
- [ ] Impersonation: Works correctly when authorized

### 1.9 Stats Page for TEAM_COORDINATOR
- [ ] Stats page loads without errors for TEAM_COORDINATOR
- [ ] Shows appropriate subset of data for role
- [ ] Missing stats show friendly message (not 404)

---

## 2. Error Handling (Bugsink Fixes)

### 2.1 Survey Page Loading States
- [ ] Page shows loading spinner while fetching data
- [ ] Network error during fetch: Shows error alert (not crash)
- [ ] Partial data fetch: Handles missing questions gracefully
- [ ] Empty state: Shows "no questions available" message
- [ ] Slow queries: Spinner displays, page doesn't timeout

### 2.2 World Bank API (Country Stats)
- [ ] Stats display correctly when API responds
- [ ] Network timeout: Returns gracefully, no crash
- [ ] API 500 error: Logged, component shows placeholder/fallback
- [ ] Malformed JSON: Handles without crash
- [ ] Missing data values: Shows N/A or fallback
- [ ] CORS errors: Handled silently

### 2.3 TipTap Editor Lifecycle
- [ ] Editor loads without errors
- [ ] Rapid navigation away/back: No crash or memory leak
- [ ] Component unmount during init: No "destroyed" errors
- [ ] Content persists through mount/unmount cycles
- [ ] Multiple editors on same page work independently

---

## 3. Undo/Redo in Paper Editors

### 3.1 Button Visibility & State
- [ ] Undo button visible in editor toolbar (left side)
- [ ] Redo button visible in editor toolbar (next to undo)
- [ ] Divider separates undo/redo from formatting buttons
- [ ] Icons display correctly (rotate-left, rotate-right)
- [ ] Undo disabled on fresh/empty document
- [ ] Redo disabled when nothing to redo

### 3.2 Undo Functionality
- [ ] Type text, undo: Text removed
- [ ] Apply bold, undo: Bold removed
- [ ] Apply multiple formats, undo: Reverts one at a time
- [ ] Paste content, undo: Content removed
- [ ] Multiple undos in sequence work correctly
- [ ] Undo limit reached: Button becomes disabled

### 3.3 Redo Functionality
- [ ] After undo, redo: Content restored
- [ ] Multiple redos in sequence work correctly
- [ ] Redo after new edit: Redo history cleared
- [ ] Redo button enables only after undo

### 3.4 Keyboard Shortcuts
- [ ] Ctrl+Z triggers undo (Windows/Linux)
- [ ] Ctrl+Y triggers redo (Windows/Linux)
- [ ] Ctrl+Shift+Z triggers redo (alternative)
- [ ] Cmd+Z triggers undo (Mac, if applicable)
- [ ] Cmd+Shift+Z triggers redo (Mac, if applicable)

### 3.5 Test in Both Editor Types
- [ ] **PaperFormat** (Position Papers): Undo/redo works
- [ ] **ReviewFormat** (Reviews): Undo/redo works

---

## 4. Resolution Editor Library Integration

### 4.1 Basic Editor Functionality
- [ ] New resolution page loads editor correctly
- [ ] Existing resolution opens in editor
- [ ] Content editable in all sections (preamble, operative)
- [ ] Save changes: Content persists
- [ ] Cancel/navigate away: Prompts if unsaved changes

### 4.2 Clause Management
- [ ] Add preamble clause
- [ ] Add operative clause
- [ ] Add sub-clause (nested)
- [ ] Delete clause
- [ ] Reorder clauses (drag/drop or buttons)
- [ ] Sub-clause depth limit (MAX_SUBCLAUSE_DEPTH) enforced

### 4.3 Text Formatting
- [ ] Bold text
- [ ] Italic text
- [ ] Country/entity references
- [ ] Links work correctly

### 4.4 Import/Export
- [ ] Import modal (if available) works
- [ ] Phrase suggestions display correctly
- [ ] Phrase lookup modal works

### 4.5 Backward Compatibility
- [ ] Existing resolutions created before library migration load correctly
- [ ] No data loss or corruption
- [ ] All clause types render properly

### 4.6 Translations
- [ ] German labels display correctly
- [ ] English labels display correctly
- [ ] Language switch updates labels reactively
- [ ] All 40+ translation keys render (no missing text)

### 4.7 Print View
- [ ] Print view (`/paperhub/[paperId]/print`) renders resolution
- [ ] Formatting preserved in print view
- [ ] All clauses and sub-clauses visible

### 4.8 Diff Viewer
- [ ] Diff viewer loads without errors
- [ ] Version comparisons display correctly
- [ ] Clause additions/deletions highlighted

---

## 5. Review Progress in Paper Hub

### 5.1 Statistics Display
- [ ] Stats component appears on Paper Hub overview
- [ ] Review progress percentage displayed prominently
- [ ] Acceptance rate displayed
- [ ] Paper counts by type shown

### 5.2 Calculation Accuracy
- [ ] **0 papers**: Shows 0% review progress, 0% acceptance
- [ ] **All papers reviewed**: Shows 100% review progress
- [ ] **All non-drafts accepted**: Shows 100% acceptance rate
- [ ] **All drafts**: Shows 0% acceptance rate (not divide by zero)
- [ ] **Mixed states**: Percentages calculate correctly

### 5.3 Chart Visualizations
- [ ] Bar chart shows paper distribution by type
- [ ] Multi-series bar chart shows status breakdown
- [ ] Gauge chart shows review progress visually
- [ ] Colors consistent with DaisyUI theme
- [ ] Charts render without errors with 0 data

### 5.4 Committee-Level Stats
- [ ] Stats broken down by committee
- [ ] Committee names/abbreviations display correctly
- [ ] Empty committees show 0 papers

### 5.5 Reactive Updates
- [ ] Stats update when paper status changes
- [ ] Stats update when new paper added
- [ ] No lag with large paper counts

---

## 6. Cross-Cutting Concerns

### 6.1 Translations
- [ ] All new features have German translations
- [ ] All new features have English translations
- [ ] No missing translation keys visible
- [ ] Language switch works on all new pages

### 6.2 Authorization
- [ ] Unauthorized access returns 403 (not 500)
- [ ] Role checks work correctly across all new features
- [ ] No privilege escalation possible

### 6.3 Mobile Responsiveness
- [ ] Team management pages usable on mobile
- [ ] Paper editor usable on tablet+
- [ ] Stats display adapts to screen size
- [ ] Modal dialogs work on mobile

### 6.4 Performance
- [ ] Pages load without excessive delay
- [ ] No memory leaks during extended use
- [ ] Charts render efficiently with large datasets

### 6.5 Error Recovery
- [ ] Network errors show user-friendly messages
- [ ] Retry options available where appropriate
- [ ] No data loss on transient failures

---

## Testing Priority Order

1. **Critical** - Test first:
   - Team invitation magic link complete flow (1.5-1.6)
   - Error handling on survey/World Bank API (2.1-2.2)
   - Resolution editor basic functionality (4.1-4.2)

2. **High** - Test second:
   - Team member CRUD operations (1.7-1.8)
   - Undo/redo functionality (3.1-3.3)
   - Review progress calculations (5.1-5.2)

3. **Medium** - Test third:
   - Email content and formatting (1.5)
   - Keyboard shortcuts (3.4)
   - Chart visualizations (5.3-5.4)
   - Translation completeness (6.1)

---

## Notes

- Check browser console for JavaScript errors during all tests
- Test with both German and English locales
- Test with different user roles where applicable
- Document any issues found with reproduction steps
