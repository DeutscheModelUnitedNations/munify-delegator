# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assignment/sighting.spec.ts >> the sighting seeks, filters and searches in the backend
- Location: e2e/assignment/sighting.spec.ts:93:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('h3').filter({ has: locator('i.fa-users, i.fa-user') })
Expected: "Particularly Dignified Boutros-Boutros-Ghali"
Received: " Particularly August Kofi-Annan"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('h3').filter({ has: locator('i.fa-users, i.fa-user') }) with timeout 5000ms
  - waiting for locator('h3').filter({ has: locator('i.fa-users, i.fa-user') })
    14 × locator resolved to <h3 class="flex items-center gap-2 text-xl font-bold break-words">…</h3>
       - unexpected value " Particularly August Kofi-Annan"

```

```yaml
- heading "Particularly August Kofi-Annan" [level=3]
```

# Test source

```ts
  21  | 
  22  | 	await page
  23  | 		.getByRole('button', { name: /^(weiter|next)\b/i })
  24  | 		.first()
  25  | 		.click();
  26  | 	await expect(position).toHaveText(/^2 (von|of) \d+$/);
  27  | 	await expect(heading).not.toHaveText(first);
  28  | 
  29  | 	await page.keyboard.press('ArrowLeft');
  30  | 	await expect(position).toHaveText(/^1 (von|of) \d+$/);
  31  | 	await expect(heading).toHaveText(first);
  32  | 
  33  | 	await page.keyboard.press('ArrowRight');
  34  | 	await expect(position).toHaveText(/^2 (von|of) \d+$/);
  35  | 
  36  | 	// The strip jumps to any card, and the position survives a reload.
  37  | 	await page
  38  | 		.getByRole('list', { name: /überblick|glance/i })
  39  | 		.getByRole('button')
  40  | 		.nth(3)
  41  | 		.click();
  42  | 	await expect(position).toHaveText(/^4 (von|of) \d+$/);
  43  | 	await page.reload();
  44  | 	await waitForHydration(page);
  45  | 	await expect(position).toHaveText(/^4 (von|of) \d+$/);
  46  | });
  47  | 
  48  | // Ratings, exclusions and notes live in the database, not in the browser: they come back after a
  49  | // reload and colour the card in the strip of the deck. A delegation of its own, since applying a
  50  | // draft in the assignment spec creates and deletes delegations at the front of the deck.
  51  | test('the sighting keeps ratings, exclusions and notes on the server', async ({ page }) => {
  52  | 	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
  53  | 		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/assignment/sighting?application=${E2E_COMMITTEE_ASSIGN_DELEGATION_ID}`
  54  | 	});
  55  | 	const card = page
  56  | 		.getByRole('list', { name: /überblick|glance/i })
  57  | 		.locator('button[aria-current="true"]');
  58  | 	await expect(card).toHaveClass(/bg-base-300/);
  59  | 
  60  | 	await page.getByRole('button', { name: /ausschließen|exclude|disqualif/i }).click();
  61  | 	await expect(card).toHaveClass(/bg-error/);
  62  | 
  63  | 	const note = page.getByRole('textbox', { name: /notiz|note/i });
  64  | 	await note.fill('e2e note');
  65  | 	await note.blur();
  66  | 	await expect(note).toHaveValue('e2e note');
  67  | 
  68  | 	await page.reload();
  69  | 	await waitForHydration(page);
  70  | 	await expect(card).toHaveClass(/bg-error/);
  71  | 	await expect(page.getByRole('textbox', { name: /notiz|note/i })).toHaveValue('e2e note');
  72  | 
  73  | 	// Undo, so the shared seed stays as it was. Reviews show before they are saved, so wait for
  74  | 	// the saves themselves: the test ending first would leave the application excluded.
  75  | 	const saved = () =>
  76  | 		page.waitForResponse(
  77  | 			(res) =>
  78  | 				res.url().includes('/api/graphql') &&
  79  | 				(res.request().postData() ?? '').includes('upsertAssignmentReview')
  80  | 		);
  81  | 	let save = saved();
  82  | 	await page.getByRole('button', { name: /ausschließen|exclude|disqualif/i }).click();
  83  | 	await save;
  84  | 	await expect(card).toHaveClass(/bg-base-300/);
  85  | 	save = saved();
  86  | 	await page.getByRole('textbox', { name: /notiz|note/i }).fill('');
  87  | 	await page.getByRole('textbox', { name: /notiz|note/i }).blur();
  88  | 	await save;
  89  | });
  90  | 
  91  | // The deck, its filters, the slider and the search are the backend's: only a window of the deck
  92  | // and the card on top are ever loaded.
  93  | test('the sighting seeks, filters and searches in the backend', async ({ page }) => {
  94  | 	const errors: string[] = [];
  95  | 	page.on('pageerror', (error) => errors.push(error.message));
  96  | 	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
  97  | 		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/assignment/sighting`
  98  | 	});
  99  | 	const position = page.getByTestId('deck-position');
  100 | 	await expect(position).toHaveText(/^1 (von|of) \d+$/);
  101 | 	const heading = page.locator('h3').filter({ has: page.locator('i.fa-users, i.fa-user') });
  102 | 	const first = await heading.innerText();
  103 | 
  104 | 	// the slider seeks to a place in the deck
  105 | 	await page.getByRole('slider').fill('3');
  106 | 	await expect(position).toHaveText(/^3 (von|of) \d+$/);
  107 | 	await expect(heading).not.toHaveText(first);
  108 | 
  109 | 	// a status filter narrows the deck: nothing is flagged in the seed
  110 | 	await page.getByLabel(/status/i).selectOption('flagged');
  111 | 	await expect(page.getByText(/keine|no applications/i).first()).toBeVisible();
  112 | 	await page.getByLabel(/status/i).selectOption('all');
  113 | 	await expect(position).toHaveText(/^\d+ (von|of) \d+$/);
  114 | 
  115 | 	// the codename finds the application, and picking it brings it back to the deck
  116 | 	const name = await heading.innerText();
  117 | 	await page.getByRole('searchbox').first().fill(name.trim().slice(0, 12));
  118 | 	const results = page.getByTestId('search-count');
  119 | 	await expect(results).toBeVisible({ timeout: 15_000 });
  120 | 	await page.getByRole('searchbox').first().press('Enter');
> 121 | 	await expect(heading).toHaveText(name);
      |                        ^ Error: expect(locator).toHaveText(expected) failed
  122 | 
  123 | 	expect(errors, 'no uncaught browser errors').toEqual([]);
  124 | });
  125 | 
  126 | // A review is changed field by field: two people reviewing at once must not undo each other's
  127 | // fields, so a change leaves everything it does not name as it was.
  128 | test('a review change keeps the fields it does not name', async ({ page }) => {
  129 | 	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));
  130 | 	const review = async (fields: string) => {
  131 | 		const res = await page.request.post('/api/graphql', {
  132 | 			headers: { 'x-locale': 'en' },
  133 | 			data: {
  134 | 				query: `mutation ($d: ID!) {
  135 | 					upsertAssignmentReview(delegationId: $d, ${fields}) {
  136 | 						evaluation flagged disqualified required note
  137 | 					}
  138 | 				}`,
  139 | 				variables: { d: E2E_COMMITTEE_ASSIGN_DELEGATION_ID }
  140 | 			}
  141 | 		});
  142 | 		return (await res.json()) as {
  143 | 			data?: { upsertAssignmentReview: Record<string, unknown> } | null;
  144 | 			errors?: { message: string }[];
  145 | 		};
  146 | 	};
  147 | 
  148 | 	// From a known review, whatever an earlier test left behind
  149 | 	expect(
  150 | 		(
  151 | 			await review(
  152 | 				'evaluation: 4, flagged: false, disqualified: false, required: false, note: null'
  153 | 			)
  154 | 		).data?.upsertAssignmentReview
  155 | 	).toMatchObject({ evaluation: 4, required: false });
  156 | 	expect((await review('note: "e2e partial"')).data?.upsertAssignmentReview).toMatchObject({
  157 | 		evaluation: 4,
  158 | 		note: 'e2e partial'
  159 | 	});
  160 | 	expect((await review('required: true')).data?.upsertAssignmentReview).toMatchObject({
  161 | 		evaluation: 4,
  162 | 		required: true,
  163 | 		note: 'e2e partial'
  164 | 	});
  165 | 
  166 | 	// Excluding it alone would leave it both required and excluded, which the stored row refuses.
  167 | 	const refused = await review('disqualified: true');
  168 | 	expect(refused.errors?.[0]?.message).toMatch(/excluded|ausgeschlossen/i);
  169 | 	expect((await review('note: "kept"')).data?.upsertAssignmentReview).toMatchObject({
  170 | 		disqualified: false,
  171 | 		required: true
  172 | 	});
  173 | 
  174 | 	// Undo, so the shared seed stays as it was.
  175 | 	expect(
  176 | 		(await review('evaluation: null, note: null, required: false')).data?.upsertAssignmentReview
  177 | 	).toMatchObject({ evaluation: null, note: null, required: false, disqualified: false });
  178 | });
  179 | 
```