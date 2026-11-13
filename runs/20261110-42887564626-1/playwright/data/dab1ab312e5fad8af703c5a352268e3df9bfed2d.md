# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility/accessibility.spec.ts >> a dialog takes the focus, keeps it, and hands it back on Escape
- Location: e2e/accessibility/accessibility.spec.ts:121:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /schule ändern|change school/i })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "Zum Inhalt springen" [ref=f1e3] [cursor=pointer]:
    - /url: "#main-content"
  - region "Notifications alt+T"
  - main [ref=f1e5]:
    - heading "Es ist ein interner Serverfehler aufgetreten." [level=1] [ref=f1e6]
    - paragraph [ref=f1e7]: Internal Error
    - link "Zurück zur Homepage" [ref=f1e8] [cursor=pointer]:
      - /url: /
  - contentinfo [ref=f1e10]:
    - navigation [ref=f1e11]:
      - link "Startseite" [ref=f1e12] [cursor=pointer]:
        - /url: /
      - link "Handbuch" [ref=f1e13] [cursor=pointer]:
        - /url: /docs/user-manual/participant/dashboard
      - link "Impressum & Datenschutz" [ref=f1e14] [cursor=pointer]:
        - /url: https://dmun.de/legal
    - generic [ref=f1e15]:
      - generic [ref=f1e16]:
        - button "English" [ref=f1e17] [cursor=pointer]
        - button "Deutsch" [pressed] [ref=f1e20] [cursor=pointer]
      - button "Hoher Kontrast" [ref=f1e23] [cursor=pointer]:
        - generic [aria-hidden] [ref=f1e24]: 
        - text: Hoher Kontrast
    - navigation "Social Media" [ref=f1e25]:
      - generic [ref=f1e26]:
        - link "Instagram" [ref=f1e27] [cursor=pointer]:
          - /url: https://www.instagram.com/dmun_ev/
          - generic [aria-hidden] [ref=f1e28]: 
        - link "YouTube" [ref=f1e29] [cursor=pointer]:
          - /url: https://www.youtube.com/user/DeutscheMUNeV
          - generic [aria-hidden] [ref=f1e30]: 
        - link "GitHub" [ref=f1e31] [cursor=pointer]:
          - /url: https://github.com/deutschemodelunitednations
          - generic [aria-hidden] [ref=f1e32]: 
    - generic [ref=f1e33]:
      - paragraph [ref=f1e34]: Ein Service von
      - link [ref=f1e35] [cursor=pointer]:
        - /url: https://dmun.de
        - img "DMUN – Deutsche Model United Nations e.V." [ref=f1e36]
      - paragraph [ref=f1e37]: Copyright © 2024-2026 - Alle Rechte vorbehalten von Deutsche Model United Nations e.V.
      - generic [ref=f1e38]:
        - generic [ref=f1e39]:
          - generic [ref=f1e40]: "Version:"
          - generic [ref=f1e41]: nightly
        - generic [ref=f1e42]:
          - generic [ref=f1e43]: "SHA:"
          - generic [ref=f1e44]: unknown
```

# Test source

```ts
  26  | 		'wcag21aa',
  27  | 		'wcag22aa'
  28  | 	]);
  29  | 	// What only `vite dev` mounts (E2E_SERVER=dev): the value inspector and the dev tools button
  30  | 	builder.exclude('.inspect-panel').exclude('[data-dev-tools]');
  31  | 	if (!contrast) builder.disableRules(['color-contrast']);
  32  | 	const { violations } = await builder.analyze();
  33  | 	return violations
  34  | 		.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
  35  | 		.flatMap((violation) =>
  36  | 			violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`)
  37  | 		);
  38  | }
  39  | 
  40  | async function scan(page: Page, paths: string[], { contrast }: { contrast: boolean }) {
  41  | 	// Sections that fade in on scrolling are shown at once, as for anyone who asks for less motion
  42  | 	await page.emulateMedia({ reducedMotion: 'reduce' });
  43  | 	const found: string[] = [];
  44  | 	for (const path of paths) {
  45  | 		await page.goto(path);
  46  | 		await waitForHydration(page);
  47  | 		// Skeletons stand in while a page's data loads; scan what is shown afterwards
  48  | 		await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15_000 });
  49  | 		found.push(...(await violations(page, { contrast })).map((line) => `${path} ${line}`));
  50  | 	}
  51  | 	return found;
  52  | }
  53  | 
  54  | function highContrast(page: Page) {
  55  | 	return page.addInitScript(() => localStorage.setItem('contrast', 'more'));
  56  | }
  57  | 
  58  | test.describe('public pages', () => {
  59  | 	test('have no serious violations', async ({ page }) => {
  60  | 		expect(await scan(page, PUBLIC_ROUTES, { contrast: false })).toEqual([]);
  61  | 	});
  62  | 
  63  | 	test('pass contrast in high contrast', async ({ page }) => {
  64  | 		await highContrast(page);
  65  | 		expect(await scan(page, PUBLIC_ROUTES, { contrast: true })).toEqual([]);
  66  | 	});
  67  | });
  68  | 
  69  | test.describe('participant dashboard', () => {
  70  | 	test.setTimeout(180_000);
  71  | 
  72  | 	test.beforeEach(async ({ page }) => {
  73  | 		await loginAs(page, fixedTestUser(E2E_PREP_PARTICIPANT_USER_ID), {
  74  | 			startUrl: `/dashboard/${E2E_PREP_CONFERENCE_ID}`
  75  | 		});
  76  | 	});
  77  | 
  78  | 	test('has no serious violations', async ({ page }) => {
  79  | 		expect(await scan(page, PARTICIPANT_ROUTES, { contrast: false })).toEqual([]);
  80  | 	});
  81  | 
  82  | 	test('passes contrast in high contrast', async ({ page }) => {
  83  | 		await highContrast(page);
  84  | 		expect(await scan(page, PARTICIPANT_ROUTES, { contrast: true })).toEqual([]);
  85  | 	});
  86  | });
  87  | 
  88  | test('the first Tab reaches the skip link, which moves on to the content', async ({ page }) => {
  89  | 	await page.goto('/');
  90  | 	await waitForHydration(page);
  91  | 	await page.keyboard.press('Tab');
  92  | 	const skip = page.getByRole('link', { name: /zum inhalt springen|skip to content/i });
  93  | 	await expect(skip).toBeFocused();
  94  | 	await page.keyboard.press('Enter');
  95  | 	await expect(page.locator('main#main-content')).toBeFocused();
  96  | });
  97  | 
  98  | test('the high contrast toggle applies at once and stays chosen', async ({ page }) => {
  99  | 	await page.goto('/');
  100 | 	await waitForHydration(page);
  101 | 	const toggle = page.getByRole('button', { name: /hoher kontrast|high contrast/i });
  102 | 	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  103 | 	await toggle.click();
  104 | 	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  105 | 	await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  106 | 	await page.reload();
  107 | 	// Set before the first paint, by the script in app.html
  108 | 	await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  109 | });
  110 | 
  111 | test('the language buttons are named in their own language', async ({ page }) => {
  112 | 	await page.goto('/');
  113 | 	await waitForHydration(page);
  114 | 	await expect(page.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
  115 | 		'aria-pressed',
  116 | 		'true'
  117 | 	);
  118 | 	await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en');
  119 | });
  120 | 
  121 | test('a dialog takes the focus, keeps it, and hands it back on Escape', async ({ page }) => {
  122 | 	await loginAs(page, fixedTestUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID), {
  123 | 		startUrl: `/dashboard/${E2E_CONFERENCE_ID}`
  124 | 	});
  125 | 	const opener = page.getByRole('button', { name: /schule ändern|change school/i });
> 126 | 	await opener.click();
      |               ^ Error: locator.click: Test timeout of 30000ms exceeded.
  127 | 	const dialog = page.getByRole('dialog', { name: /schule ändern|change school/i });
  128 | 	await expect(dialog).toBeVisible();
  129 | 	await expect(dialog.locator(':focus')).toHaveCount(1);
  130 | 	// However far Tab goes, it stays inside
  131 | 	for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  132 | 	await expect(dialog.locator(':focus')).toHaveCount(1);
  133 | 	await page.keyboard.press('Escape');
  134 | 	await expect(dialog).toBeHidden();
  135 | 	await expect(opener).toBeFocused();
  136 | });
  137 | 
```