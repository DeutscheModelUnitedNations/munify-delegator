# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment/payment-delegation.spec.ts >> a head delegate can generate a delegation payment reference covering all members
- Location: e2e/payment/payment-delegation.spec.ts:12:1

# Error details

```
Error: locator.click: Timeout 2000ms exceeded.
Call log:
  - waiting for locator('ol button.card').filter({ hasText: /Delegation erstellen/ })


Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - region "Notifications alt+T"
  - generic [ref=f2e4]:
    - banner [ref=f2e5]:
      - generic [ref=f2e6]:
        - generic [ref=f2e7]:
          - link "MUNify DELEGATOR" [ref=f2e8] [cursor=pointer]:
            - /url: /dashboard
          - list [ref=f2e12]:
            - listitem [ref=f2e13]:
              - link "Konferenzen" [ref=f2e14] [cursor=pointer]:
                - /url: http://localhost:4173/dashboard
        - button "Testperson authz-head" [ref=f2e19] [cursor=pointer]: TA
    - generic [ref=f2e23]:
      - banner [ref=f2e24]:
        - generic [ref=f2e27]:
          - heading "Konferenzen" [level=1] [ref=f2e28]
          - paragraph [ref=f2e29]: Wählen Sie eine Konferenz, um zu Ihrem Bereich zu gelangen oder sich zu bewerben.
      - generic [ref=f2e30]:
        - generic [ref=f2e31]:
          - generic [ref=f2e32]:
            - heading "Bewerbung offen" [level=3] [ref=f2e33]
            - generic [ref=f2e35]: "2"
          - generic [ref=f2e37]:
            - link "Bewerbung offen E2E Seats Conference Donnelly LLC Konferenz 12. Nov. 2026 – 2. Dez. 2026 Lindgren-Haagview Zum Dashboard" [ref=f2e38] [cursor=pointer]:
              - /url: /dashboard/e2e00000conference0000005
              - figure [ref=f2e39]
              - generic [ref=f2e40]:
                - generic [ref=f2e41]: Bewerbung offen
                - generic [ref=f2e44]:
                  - generic [ref=f2e45]:
                    - heading "E2E Seats Conference" [level=3] [ref=f2e46]
                    - paragraph [ref=f2e47]: Donnelly LLC Konferenz
                  - generic [ref=f2e48]:
                    - generic [ref=f2e49]: 12. Nov. 2026 – 2. Dez. 2026
                    - generic [ref=f2e51]: Lindgren-Haagview
                  - generic [ref=f2e53]: Zum Dashboard
            - link "Delegation Bewerbung offen E2E Test Conference Rice LLC Konferenz 31. Dez. 2026 – 3. Jan. 2027 Port Nigelchester Zum Dashboard" [ref=f2e55] [cursor=pointer]:
              - /url: /dashboard/e2e00000conference0000001
              - figure [ref=f2e56]
              - generic [ref=f2e57]:
                - generic [ref=f2e58]:
                  - generic [ref=f2e59]: Delegation
                  - generic [ref=f2e61]: Bewerbung offen
                - generic [ref=f2e63]:
                  - generic [ref=f2e64]:
                    - heading "E2E Test Conference" [level=3] [ref=f2e65]
                    - paragraph [ref=f2e66]: Rice LLC Konferenz
                  - generic [ref=f2e67]:
                    - generic [ref=f2e68]: 31. Dez. 2026 – 3. Jan. 2027
                    - generic [ref=f2e70]: Port Nigelchester
                  - generic [ref=f2e72]: Zum Dashboard
        - generic [ref=f2e74]:
          - generic [ref=f2e75]:
            - heading "In Vorbereitung" [level=3] [ref=f2e76]
            - generic [ref=f2e78]: "3"
          - generic [ref=f2e80]:
            - link "In Vorbereitung E2E Email Pace Conference Leannon - Dickinson Konferenz 9. Nov. 2026 – 2. Dez. 2026 North Charleston Bewerben" [ref=f2e81] [cursor=pointer]:
              - /url: /dashboard/e2e00000conference0000007
              - figure [ref=f2e82]
              - generic [ref=f2e83]:
                - generic [ref=f2e84]: In Vorbereitung
                - generic [ref=f2e87]:
                  - generic [ref=f2e88]:
                    - heading "E2E Email Pace Conference" [level=3] [ref=f2e89]
                    - paragraph [ref=f2e90]: Leannon - Dickinson Konferenz
                  - generic [ref=f2e91]:
                    - generic [ref=f2e92]: 9. Nov. 2026 – 2. Dez. 2026
                    - generic [ref=f2e94]: North Charleston
                  - generic [ref=f2e96]: Bewerben
            - link "In Vorbereitung E2E Unreleased Conference Legros Group Konferenz 10. Nov. 2026 – 6. Dez. 2026 Bayonne Bewerben" [ref=f2e98] [cursor=pointer]:
              - /url: /dashboard/e2e00000conference0000004
              - figure [ref=f2e99]
              - generic [ref=f2e100]:
                - generic [ref=f2e101]: In Vorbereitung
                - generic [ref=f2e104]:
                  - generic [ref=f2e105]:
                    - heading "E2E Unreleased Conference" [level=3] [ref=f2e106]
                    - paragraph [ref=f2e107]: Legros Group Konferenz
                  - generic [ref=f2e108]:
                    - generic [ref=f2e109]: 10. Nov. 2026 – 6. Dez. 2026
                    - generic [ref=f2e111]: Bayonne
                  - generic [ref=f2e113]: Bewerben
            - link "In Vorbereitung E2E Prep Conference Fisher Inc Konferenz 10. Nov. 2026 – 3. Dez. 2026 East Hillaryport Bewerben" [ref=f2e115] [cursor=pointer]:
              - /url: /dashboard/e2e00000conference0000002
              - figure [ref=f2e116]
              - generic [ref=f2e117]:
                - generic [ref=f2e118]: In Vorbereitung
                - generic [ref=f2e121]:
                  - generic [ref=f2e122]:
                    - heading "E2E Prep Conference" [level=3] [ref=f2e123]
                    - paragraph [ref=f2e124]: Fisher Inc Konferenz
                  - generic [ref=f2e125]:
                    - generic [ref=f2e126]: 10. Nov. 2026 – 3. Dez. 2026
                    - generic [ref=f2e128]: East Hillaryport
                  - generic [ref=f2e130]: Bewerben
  - contentinfo [ref=f2e133]:
    - navigation [ref=f2e134]:
      - link "Startseite" [ref=f2e135] [cursor=pointer]:
        - /url: /
      - link "Impressum & Datenschutz" [ref=f2e136] [cursor=pointer]:
        - /url: https://dmun.de/legal
    - generic [ref=f2e137]:
      - button [ref=f2e138] [cursor=pointer]
      - button [ref=f2e141] [cursor=pointer]
    - navigation [ref=f2e144]:
      - generic [ref=f2e145]:
        - link "Instagram" [ref=f2e146] [cursor=pointer]:
          - /url: https://www.instagram.com/dmun_ev/
        - link "YouTube" [ref=f2e148] [cursor=pointer]:
          - /url: https://www.youtube.com/user/DeutscheMUNeV
        - link "GitHub" [ref=f2e150] [cursor=pointer]:
          - /url: https://github.com/deutschemodelunitednations
    - complementary [ref=f2e152]:
      - paragraph [ref=f2e153]: Ein Service von
      - link [ref=f2e154] [cursor=pointer]:
        - /url: https://dmun.de
        - img "DMUN – Deutsche Model United Nations e.V." [ref=f2e155]
      - paragraph [ref=f2e156]: Copyright © 2024-2026 - Alle Rechte vorbehalten von Deutsche Model United Nations e.V.
      - generic [ref=f2e157]:
        - generic [ref=f2e158]:
          - generic [ref=f2e159]: "Version:"
          - generic [ref=f2e160]: nightly
        - generic [ref=f2e161]:
          - generic [ref=f2e162]: "SHA:"
          - generic [ref=f2e163]: unknown
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  | import { E2E_CONFERENCE_ID } from '../seed/seed';
  3  | 
  4  | /**
  5  |  * Navigates to the conference registration overview and opens the first conference that is
  6  |  * currently open for registration (the dev seed guarantees at least one conference in
  7  |  * PARTICIPANT_REGISTRATION state - see prisma/seed/dev/seed.ts). Returns the conference id.
  8  |  */
  9  | export async function openFirstConferenceForRegistration(
  10 | 	page: Page,
  11 | 	conferenceId: string = E2E_CONFERENCE_ID
  12 | ): Promise<string> {
  13 | 	await page.goto('/dashboard');
  14 | 
  15 | 	// Target the conference explicitly rather than taking `.first()`. The seed defines more than
  16 | 	// one conference, the registration list has no guaranteed order, and picking whichever card
  17 | 	// happened to render first made every caller intermittently register for the wrong
  18 | 	// conference - which then failed much later, in an unrelated assertion.
  19 | 	// The selector page has no <main>; the conference id in the link is what picks the card.
  20 | 	const registerButton = page.locator(`a[href*="${conferenceId}"]`).first();
  21 | 	await expect(
  22 | 		registerButton,
  23 | 		`expected conference ${conferenceId} to be open for registration - is the e2e seed loaded?`
  24 | 	).toBeVisible({ timeout: 15_000 });
  25 | 
  26 | 	const href = await registerButton.getAttribute('href');
  27 | 	if (!href) throw new Error('registration button had no href');
  28 | 
  29 | 	// `resolve()` renders relative hrefs (`./registration/…`) on server-rendered pages, so compare
  30 | 	// the path the link actually points at, not the attribute text.
  31 | 	const target = new URL(href, page.url()).pathname;
  32 | 	await registerButton.click();
  33 | 	await page.waitForURL((url) => url.pathname === target);
  34 | 
  35 | 	return conferenceId;
  36 | }
  37 | 
  38 | /**
  39 |  * Picks how to apply in the dashboard's application form, by the option's title, and waits for
  40 |  * the next step to open below it.
  41 |  */
  42 | export async function chooseApplyPath(page: Page, title: RegExp): Promise<void> {
  43 | 	const option = page.locator('ol button.card', { hasText: title });
  44 | 	// Retried: a click just after navigation can land before hydration attaches the handler.
  45 | 	await expect(async () => {
  46 | 		await option.click({ timeout: 2_000 });
  47 | 		await expect(page.locator('ol > li')).toHaveCount(2, { timeout: 2_000 });
> 48 | 	}).toPass({ timeout: 15_000 });
     |     ^ Error: locator.click: Timeout 2000ms exceeded.
  49 | }
  50 | 
  51 | /**
  52 |  * Answers the application's questions, one step each, and submits the last. Starts with the school
  53 |  * step open.
  54 |  */
  55 | export async function fillApplicationSteps(
  56 | 	page: Page,
  57 | 	answers: { school: string; motivation: string; experience: string }
  58 | ): Promise<void> {
  59 | 	await page.locator('input[name="schoolName"]').fill(answers.school);
  60 | 	await page
  61 | 		.locator('ol > li')
  62 | 		.last()
  63 | 		.getByRole('button', { name: /weiter|next/i })
  64 | 		.click();
  65 | 	await page.locator('textarea[name="motivation"]').fill(answers.motivation);
  66 | 	await page
  67 | 		.locator('ol > li')
  68 | 		.last()
  69 | 		.getByRole('button', { name: /weiter|next/i })
  70 | 		.click();
  71 | 	await page.locator('textarea[name="experience"]').fill(answers.experience);
  72 | 	await page.locator('form button.btn-primary').first().click();
  73 | }
  74 | 
```