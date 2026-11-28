# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authorization/guide-outline-tools.spec.ts >> the content lead changes the sidebar step by step; a reviewer may not
- Location: e2e/authorization/guide-outline-tools.spec.ts:63:1

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
  "domcontentloaded" event fired
============================================================
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "Zum Inhalt springen" [ref=f1e3] [cursor=pointer]:
    - /url: "#main-content"
  - region "Notifications alt+T"
  - generic [ref=f1e5]:
    - banner [ref=f1e6]:
      - generic [ref=f1e7]:
        - generic [ref=f1e8]:
          - link "MUNify DELEGATOR" [ref=f1e9] [cursor=pointer]:
            - /url: /dashboard
          - list [ref=f1e18]:
            - listitem [ref=f1e19]:
              - link "Konferenzen" [ref=f1e20] [cursor=pointer]:
                - /url: https://localhost:4173/dashboard
                - generic [aria-hidden] [ref=f1e21]: 
        - generic [ref=f1e23]:
          - generic [ref=f1e24]:
            - button "Hilfe" [ref=f1e25] [cursor=pointer]:
              - generic [ref=f1e26]: 
            - text:  
          - generic [ref=f1e27]:
            - button "Testperson eCe-guide-content-lead-c" [ref=f1e28] [cursor=pointer]:
              - generic [aria-hidden] [ref=f1e29]: 
            - text:   
    - main [ref=f1e31]:
      - generic [ref=f1e34]:
        - generic [ref=f1e38]:
          - heading "Konferenzen" [level=1] [ref=f1e39]
          - paragraph [ref=f1e40]: Wähle eine Konferenz, um zu deinem Bereich zu gelangen oder dich zu bewerben.
        - generic [ref=f1e41]:
          - generic [ref=f1e42]:
            - heading "Deine Konferenzen" [level=2] [ref=f1e43]
            - generic [ref=f1e44]: "1"
          - 'link "Teammitglied · Leitung Inhalt Konferenzsprache: Deutsch In Vorbereitung E2E Guide C Altenwerth, Treutel and Goodwin Konferenz 10. Dez. 2026 – 29. Dez. 2026 Port Charlotte Zur Übersicht" [ref=f1e46] [cursor=pointer]':
            - /url: /dashboard/e2e00000conference0000019
            - figure [ref=f1e47]
            - generic [ref=f1e48]:
              - generic [ref=f1e49]:
                - generic [ref=f1e50]:
                  - generic [aria-hidden] [ref=f1e51]: 
                  - text: Teammitglied · Leitung Inhalt
                - generic [ref=f1e52]:
                  - generic "Konferenzsprache" [ref=f1e53]:
                    - generic [aria-hidden] [ref=f1e54]: 
                    - generic [ref=f1e55]: "Konferenzsprache:"
                    - text: Deutsch
                  - generic [ref=f1e56]:
                    - generic [aria-hidden] [ref=f1e57]: 
                    - text: In Vorbereitung
              - generic [ref=f1e58]:
                - generic [ref=f1e59]:
                  - heading "E2E Guide C" [level=3] [ref=f1e60]
                  - paragraph [ref=f1e61]: Altenwerth, Treutel and Goodwin Konferenz
                - generic [ref=f1e62]:
                  - generic [ref=f1e63]:
                    - generic [aria-hidden] [ref=f1e64]: 
                    - text: 10. Dez. 2026 – 29. Dez. 2026
                  - generic [ref=f1e65]:
                    - generic [aria-hidden] [ref=f1e66]: 
                    - text: Port Charlotte
                - generic [ref=f1e67]:
                  - text: Zur Übersicht
                  - generic [aria-hidden] [ref=f1e68]: 
        - generic [ref=f1e69]:
          - generic [ref=f1e70]:
            - generic [ref=f1e71]:
              - heading "Bewerbung offen" [level=3] [ref=f1e72]:
                - generic [aria-hidden] [ref=f1e73]: 
                - text: Bewerbung offen
              - generic [ref=f1e74]: "4"
            - generic [ref=f1e76]:
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E Feature Requirements Conference Wolff - Lueilwitz Konferenz 4. Dez. 2026 – 26. Dez. 2026 Eagan Zur Übersicht" [ref=f1e77] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000021
                - figure [ref=f1e78]
                - generic [ref=f1e79]:
                  - generic [ref=f1e81]:
                    - generic "Konferenzsprache" [ref=f1e82]:
                      - generic [aria-hidden] [ref=f1e83]: 
                      - generic [ref=f1e84]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e85]:
                      - generic [aria-hidden] [ref=f1e86]: 
                      - text: Bewerbung offen
                  - generic [ref=f1e87]:
                    - generic [ref=f1e88]:
                      - heading "E2E Feature Requirements Conference" [level=3] [ref=f1e89]
                      - paragraph [ref=f1e90]: Wolff - Lueilwitz Konferenz
                    - generic [ref=f1e91]:
                      - generic [ref=f1e92]:
                        - generic [aria-hidden] [ref=f1e93]: 
                        - text: 4. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e94]:
                        - generic [aria-hidden] [ref=f1e95]: 
                        - text: Eagan
                    - generic [ref=f1e96]:
                      - text: Zur Übersicht
                      - generic [aria-hidden] [ref=f1e97]: 
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E Seats Conference Conn, Schmeler and Keeling Konferenz 5. Dez. 2026 – 27. Dez. 2026 Connellychester Zur Übersicht" [ref=f1e98] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000005
                - figure [ref=f1e99]
                - generic [ref=f1e100]:
                  - generic [ref=f1e102]:
                    - generic "Konferenzsprache" [ref=f1e103]:
                      - generic [aria-hidden] [ref=f1e104]: 
                      - generic [ref=f1e105]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e106]:
                      - generic [aria-hidden] [ref=f1e107]: 
                      - text: Bewerbung offen
                  - generic [ref=f1e108]:
                    - generic [ref=f1e109]:
                      - heading "E2E Seats Conference" [level=3] [ref=f1e110]
                      - paragraph [ref=f1e111]: Conn, Schmeler and Keeling Konferenz
                    - generic [ref=f1e112]:
                      - generic [ref=f1e113]:
                        - generic [aria-hidden] [ref=f1e114]: 
                        - text: 5. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e115]:
                        - generic [aria-hidden] [ref=f1e116]: 
                        - text: Connellychester
                    - generic [ref=f1e117]:
                      - text: Zur Übersicht
                      - generic [aria-hidden] [ref=f1e118]: 
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E School Conference Hickle, Kuhlman and Bernhard Konferenz 6. Dez. 2026 – 30. Dez. 2026 Rohanboro Zur Übersicht" [ref=f1e119] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000012
                - figure [ref=f1e120]
                - generic [ref=f1e121]:
                  - generic [ref=f1e123]:
                    - generic "Konferenzsprache" [ref=f1e124]:
                      - generic [aria-hidden] [ref=f1e125]: 
                      - generic [ref=f1e126]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e127]:
                      - generic [aria-hidden] [ref=f1e128]: 
                      - text: Bewerbung offen
                  - generic [ref=f1e129]:
                    - generic [ref=f1e130]:
                      - heading "E2E School Conference" [level=3] [ref=f1e131]
                      - paragraph [ref=f1e132]: Hickle, Kuhlman and Bernhard Konferenz
                    - generic [ref=f1e133]:
                      - generic [ref=f1e134]:
                        - generic [aria-hidden] [ref=f1e135]: 
                        - text: 6. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e136]:
                        - generic [aria-hidden] [ref=f1e137]: 
                        - text: Rohanboro
                    - generic [ref=f1e138]:
                      - text: Zur Übersicht
                      - generic [aria-hidden] [ref=f1e139]: 
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E Test Conference Gerlach, Anderson and Witting Konferenz 25. Jan. 2027 – 28. Jan. 2027 West Estevan Bewerben" [ref=f1e140] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000001
                - figure [ref=f1e141]
                - generic [ref=f1e142]:
                  - generic [ref=f1e144]:
                    - generic "Konferenzsprache" [ref=f1e145]:
                      - generic [aria-hidden] [ref=f1e146]: 
                      - generic [ref=f1e147]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e148]:
                      - generic [aria-hidden] [ref=f1e149]: 
                      - text: Bewerbung offen
                  - generic [ref=f1e150]:
                    - generic [ref=f1e151]:
                      - heading "E2E Test Conference" [level=3] [ref=f1e152]
                      - paragraph [ref=f1e153]: Gerlach, Anderson and Witting Konferenz
                    - generic [ref=f1e154]:
                      - generic [ref=f1e155]:
                        - generic [aria-hidden] [ref=f1e156]: 
                        - text: 25. Jan. 2027 – 28. Jan. 2027
                      - generic [ref=f1e157]:
                        - generic [aria-hidden] [ref=f1e158]: 
                        - text: West Estevan
                    - generic [ref=f1e159]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e160]: 
          - generic [ref=f1e161]:
            - generic [ref=f1e162]:
              - heading "In Vorbereitung" [level=3] [ref=f1e163]:
                - generic [aria-hidden] [ref=f1e164]: 
                - text: In Vorbereitung
              - generic [ref=f1e165]: "23"
            - generic [ref=f1e167]:
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Groups Conference Hayes - Lynch Konferenz 3. Dez. 2026 – 30. Dez. 2026 Fort Michealstad Bewerben" [ref=f1e168] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000grp
                - figure [ref=f1e169]
                - generic [ref=f1e170]:
                  - generic [ref=f1e172]:
                    - generic "Konferenzsprache" [ref=f1e173]:
                      - generic [aria-hidden] [ref=f1e174]: 
                      - generic [ref=f1e175]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e176]:
                      - generic [aria-hidden] [ref=f1e177]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e178]:
                    - generic [ref=f1e179]:
                      - heading "E2E Groups Conference" [level=3] [ref=f1e180]
                      - paragraph [ref=f1e181]: Hayes - Lynch Konferenz
                    - generic [ref=f1e182]:
                      - generic [ref=f1e183]:
                        - generic [aria-hidden] [ref=f1e184]: 
                        - text: 3. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e185]:
                        - generic [aria-hidden] [ref=f1e186]: 
                        - text: Fort Michealstad
                    - generic [ref=f1e187]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e188]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Notifications Conference Douglas - Koelpin Konferenz 3. Dez. 2026 – 27. Dez. 2026 Jackelineberg Bewerben" [ref=f1e189] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000ntf
                - figure [ref=f1e190]
                - generic [ref=f1e191]:
                  - generic [ref=f1e193]:
                    - generic "Konferenzsprache" [ref=f1e194]:
                      - generic [aria-hidden] [ref=f1e195]: 
                      - generic [ref=f1e196]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e197]:
                      - generic [aria-hidden] [ref=f1e198]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e199]:
                    - generic [ref=f1e200]:
                      - heading "E2E Notifications Conference" [level=3] [ref=f1e201]
                      - paragraph [ref=f1e202]: Douglas - Koelpin Konferenz
                    - generic [ref=f1e203]:
                      - generic [ref=f1e204]:
                        - generic [aria-hidden] [ref=f1e205]: 
                        - text: 3. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e206]:
                        - generic [aria-hidden] [ref=f1e207]: 
                        - text: Jackelineberg
                    - generic [ref=f1e208]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e209]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Guide Workspace Cummings - Strosin Konferenz 3. Dez. 2026 – 28. Dez. 2026 East Montecester Bewerben" [ref=f1e210] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000020
                - figure [ref=f1e211]
                - generic [ref=f1e212]:
                  - generic [ref=f1e214]:
                    - generic "Konferenzsprache" [ref=f1e215]:
                      - generic [aria-hidden] [ref=f1e216]: 
                      - generic [ref=f1e217]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e218]:
                      - generic [aria-hidden] [ref=f1e219]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e220]:
                    - generic [ref=f1e221]:
                      - heading "E2E Guide Workspace" [level=3] [ref=f1e222]
                      - paragraph [ref=f1e223]: Cummings - Strosin Konferenz
                    - generic [ref=f1e224]:
                      - generic [ref=f1e225]:
                        - generic [aria-hidden] [ref=f1e226]: 
                        - text: 3. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e227]:
                        - generic [aria-hidden] [ref=f1e228]: 
                        - text: East Montecester
                    - generic [ref=f1e229]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e230]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Review Drafts Schinner LLC Konferenz 3. Dez. 2026 – 31. Dez. 2026 Milliecester Bewerben" [ref=f1e231] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000015
                - figure [ref=f1e232]
                - generic [ref=f1e233]:
                  - generic [ref=f1e235]:
                    - generic "Konferenzsprache" [ref=f1e236]:
                      - generic [aria-hidden] [ref=f1e237]: 
                      - generic [ref=f1e238]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e239]:
                      - generic [aria-hidden] [ref=f1e240]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e241]:
                    - generic [ref=f1e242]:
                      - heading "E2E Review Drafts" [level=3] [ref=f1e243]
                      - paragraph [ref=f1e244]: Schinner LLC Konferenz
                    - generic [ref=f1e245]:
                      - generic [ref=f1e246]:
                        - generic [aria-hidden] [ref=f1e247]: 
                        - text: 3. Dez. 2026 – 31. Dez. 2026
                      - generic [ref=f1e248]:
                        - generic [aria-hidden] [ref=f1e249]: 
                        - text: Milliecester
                    - generic [ref=f1e250]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e251]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Announcements Conference Willms - Nikolaus Konferenz 4. Dez. 2026 – 26. Dez. 2026 Lake Creolaland Bewerben" [ref=f1e252] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000anu
                - figure [ref=f1e253]
                - generic [ref=f1e254]:
                  - generic [ref=f1e256]:
                    - generic "Konferenzsprache" [ref=f1e257]:
                      - generic [aria-hidden] [ref=f1e258]: 
                      - generic [ref=f1e259]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e260]:
                      - generic [aria-hidden] [ref=f1e261]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e262]:
                    - generic [ref=f1e263]:
                      - heading "E2E Announcements Conference" [level=3] [ref=f1e264]
                      - paragraph [ref=f1e265]: Willms - Nikolaus Konferenz
                    - generic [ref=f1e266]:
                      - generic [ref=f1e267]:
                        - generic [aria-hidden] [ref=f1e268]: 
                        - text: 4. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e269]:
                        - generic [aria-hidden] [ref=f1e270]: 
                        - text: Lake Creolaland
                    - generic [ref=f1e271]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e272]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Postal Guide Conference Nolan and Sons Konferenz 4. Dez. 2026 – 29. Dez. 2026 Crystalworth Bewerben" [ref=f1e273] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000pgd
                - figure [ref=f1e274]
                - generic [ref=f1e275]:
                  - generic [ref=f1e277]:
                    - generic "Konferenzsprache" [ref=f1e278]:
                      - generic [aria-hidden] [ref=f1e279]: 
                      - generic [ref=f1e280]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e281]:
                      - generic [aria-hidden] [ref=f1e282]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e283]:
                    - generic [ref=f1e284]:
                      - heading "E2E Postal Guide Conference" [level=3] [ref=f1e285]
                      - paragraph [ref=f1e286]: Nolan and Sons Konferenz
                    - generic [ref=f1e287]:
                      - generic [ref=f1e288]:
                        - generic [aria-hidden] [ref=f1e289]: 
                        - text: 4. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e290]:
                        - generic [aria-hidden] [ref=f1e291]: 
                        - text: Crystalworth
                    - generic [ref=f1e292]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e293]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E MCP Conference Metz, Dibbert and Kihn Konferenz 4. Dez. 2026 – 28. Dez. 2026 Towson Bewerben" [ref=f1e294] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000010
                - figure [ref=f1e295]
                - generic [ref=f1e296]:
                  - generic [ref=f1e298]:
                    - generic "Konferenzsprache" [ref=f1e299]:
                      - generic [aria-hidden] [ref=f1e300]: 
                      - generic [ref=f1e301]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e302]:
                      - generic [aria-hidden] [ref=f1e303]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e304]:
                    - generic [ref=f1e305]:
                      - heading "E2E MCP Conference" [level=3] [ref=f1e306]
                      - paragraph [ref=f1e307]: Metz, Dibbert and Kihn Konferenz
                    - generic [ref=f1e308]:
                      - generic [ref=f1e309]:
                        - generic [aria-hidden] [ref=f1e310]: 
                        - text: 4. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e311]:
                        - generic [aria-hidden] [ref=f1e312]: 
                        - text: Towson
                    - generic [ref=f1e313]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e314]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Unreleased Conference Bayer Inc Konferenz 4. Dez. 2026 – 27. Dez. 2026 Rosamondside Bewerben" [ref=f1e315] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000004
                - figure [ref=f1e316]
                - generic [ref=f1e317]:
                  - generic [ref=f1e319]:
                    - generic "Konferenzsprache" [ref=f1e320]:
                      - generic [aria-hidden] [ref=f1e321]: 
                      - generic [ref=f1e322]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e323]:
                      - generic [aria-hidden] [ref=f1e324]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e325]:
                    - generic [ref=f1e326]:
                      - heading "E2E Unreleased Conference" [level=3] [ref=f1e327]
                      - paragraph [ref=f1e328]: Bayer Inc Konferenz
                    - generic [ref=f1e329]:
                      - generic [ref=f1e330]:
                        - generic [aria-hidden] [ref=f1e331]: 
                        - text: 4. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e332]:
                        - generic [aria-hidden] [ref=f1e333]: 
                        - text: Rosamondside
                    - generic [ref=f1e334]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e335]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Conference Papers Unreleased Tremblay - Effertz Konferenz 4. Dez. 2026 – 31. Dez. 2026 Lindcester Bewerben" [ref=f1e336] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000014
                - figure [ref=f1e337]
                - generic [ref=f1e338]:
                  - generic [ref=f1e340]:
                    - generic "Konferenzsprache" [ref=f1e341]:
                      - generic [aria-hidden] [ref=f1e342]: 
                      - generic [ref=f1e343]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e344]:
                      - generic [aria-hidden] [ref=f1e345]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e346]:
                    - generic [ref=f1e347]:
                      - heading "E2E Conference Papers Unreleased" [level=3] [ref=f1e348]
                      - paragraph [ref=f1e349]: Tremblay - Effertz Konferenz
                    - generic [ref=f1e350]:
                      - generic [ref=f1e351]:
                        - generic [aria-hidden] [ref=f1e352]: 
                        - text: 4. Dez. 2026 – 31. Dez. 2026
                      - generic [ref=f1e353]:
                        - generic [aria-hidden] [ref=f1e354]: 
                        - text: Lindcester
                    - generic [ref=f1e355]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e356]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Guide B White and Sons Konferenz 4. Dez. 2026 – 28. Dez. 2026 Port Sherry Bewerben" [ref=f1e357] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000018
                - figure [ref=f1e358]
                - generic [ref=f1e359]:
                  - generic [ref=f1e361]:
                    - generic "Konferenzsprache" [ref=f1e362]:
                      - generic [aria-hidden] [ref=f1e363]: 
                      - generic [ref=f1e364]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e365]:
                      - generic [aria-hidden] [ref=f1e366]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e367]:
                    - generic [ref=f1e368]:
                      - heading "E2E Guide B" [level=3] [ref=f1e369]
                      - paragraph [ref=f1e370]: White and Sons Konferenz
                    - generic [ref=f1e371]:
                      - generic [ref=f1e372]:
                        - generic [aria-hidden] [ref=f1e373]: 
                        - text: 4. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e374]:
                        - generic [aria-hidden] [ref=f1e375]: 
                        - text: Port Sherry
                    - generic [ref=f1e376]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e377]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Conference Papers Schmeler, O''Keefe and Adams Konferenz 5. Dez. 2026 – 30. Dez. 2026 Wellington Bewerben" [ref=f1e378] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000013
                - figure [ref=f1e379]
                - generic [ref=f1e380]:
                  - generic [ref=f1e382]:
                    - generic "Konferenzsprache" [ref=f1e383]:
                      - generic [aria-hidden] [ref=f1e384]: 
                      - generic [ref=f1e385]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e386]:
                      - generic [aria-hidden] [ref=f1e387]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e388]:
                    - generic [ref=f1e389]:
                      - heading "E2E Conference Papers" [level=3] [ref=f1e390]
                      - paragraph [ref=f1e391]: Schmeler, O'Keefe and Adams Konferenz
                    - generic [ref=f1e392]:
                      - generic [ref=f1e393]:
                        - generic [aria-hidden] [ref=f1e394]: 
                        - text: 5. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e395]:
                        - generic [aria-hidden] [ref=f1e396]: 
                        - text: Wellington
                    - generic [ref=f1e397]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e398]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Email Pace Conference Simonis - Kovacek Konferenz 5. Dez. 2026 – 27. Dez. 2026 Port Eliezer Bewerben" [ref=f1e399] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000007
                - figure [ref=f1e400]
                - generic [ref=f1e401]:
                  - generic [ref=f1e403]:
                    - generic "Konferenzsprache" [ref=f1e404]:
                      - generic [aria-hidden] [ref=f1e405]: 
                      - generic [ref=f1e406]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e407]:
                      - generic [aria-hidden] [ref=f1e408]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e409]:
                    - generic [ref=f1e410]:
                      - heading "E2E Email Pace Conference" [level=3] [ref=f1e411]
                      - paragraph [ref=f1e412]: Simonis - Kovacek Konferenz
                    - generic [ref=f1e413]:
                      - generic [ref=f1e414]:
                        - generic [aria-hidden] [ref=f1e415]: 
                        - text: 5. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e416]:
                        - generic [aria-hidden] [ref=f1e417]: 
                        - text: Port Eliezer
                    - generic [ref=f1e418]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e419]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Announcements Rules Conference Grant - Beier Konferenz 5. Dez. 2026 – 29. Dez. 2026 Savanahborough Bewerben" [ref=f1e420] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000ana
                - figure [ref=f1e421]
                - generic [ref=f1e422]:
                  - generic [ref=f1e424]:
                    - generic "Konferenzsprache" [ref=f1e425]:
                      - generic [aria-hidden] [ref=f1e426]: 
                      - generic [ref=f1e427]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e428]:
                      - generic [aria-hidden] [ref=f1e429]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e430]:
                    - generic [ref=f1e431]:
                      - heading "E2E Announcements Rules Conference" [level=3] [ref=f1e432]
                      - paragraph [ref=f1e433]: Grant - Beier Konferenz
                    - generic [ref=f1e434]:
                      - generic [ref=f1e435]:
                        - generic [aria-hidden] [ref=f1e436]: 
                        - text: 5. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e437]:
                        - generic [aria-hidden] [ref=f1e438]: 
                        - text: Savanahborough
                    - generic [ref=f1e439]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e440]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Bank Transfer Conference Rohan, Stanton and Okuneva Konferenz 5. Dez. 2026 – 29. Dez. 2026 Monroe Bewerben" [ref=f1e441] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000022
                - figure [ref=f1e442]
                - generic [ref=f1e443]:
                  - generic [ref=f1e445]:
                    - generic "Konferenzsprache" [ref=f1e446]:
                      - generic [aria-hidden] [ref=f1e447]: 
                      - generic [ref=f1e448]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e449]:
                      - generic [aria-hidden] [ref=f1e450]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e451]:
                    - generic [ref=f1e452]:
                      - heading "E2E Bank Transfer Conference" [level=3] [ref=f1e453]
                      - paragraph [ref=f1e454]: Rohan, Stanton and Okuneva Konferenz
                    - generic [ref=f1e455]:
                      - generic [ref=f1e456]:
                        - generic [aria-hidden] [ref=f1e457]: 
                        - text: 5. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e458]:
                        - generic [aria-hidden] [ref=f1e459]: 
                        - text: Monroe
                    - generic [ref=f1e460]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e461]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Late Supervisor Conference Johnson, Keebler and Zemlak Konferenz 6. Dez. 2026 – 31. Dez. 2026 South Russel Bewerben" [ref=f1e462] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000008
                - figure [ref=f1e463]
                - generic [ref=f1e464]:
                  - generic [ref=f1e466]:
                    - generic "Konferenzsprache" [ref=f1e467]:
                      - generic [aria-hidden] [ref=f1e468]: 
                      - generic [ref=f1e469]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e470]:
                      - generic [aria-hidden] [ref=f1e471]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e472]:
                    - generic [ref=f1e473]:
                      - heading "E2E Late Supervisor Conference" [level=3] [ref=f1e474]
                      - paragraph [ref=f1e475]: Johnson, Keebler and Zemlak Konferenz
                    - generic [ref=f1e476]:
                      - generic [ref=f1e477]:
                        - generic [aria-hidden] [ref=f1e478]: 
                        - text: 6. Dez. 2026 – 31. Dez. 2026
                      - generic [ref=f1e479]:
                        - generic [aria-hidden] [ref=f1e480]: 
                        - text: South Russel
                    - generic [ref=f1e481]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e482]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Review Drafts Without Assistants Schuster - Mann-Goodwin Konferenz 7. Dez. 2026 – 28. Dez. 2026 Harmonytown Bewerben" [ref=f1e483] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000016
                - figure [ref=f1e484]
                - generic [ref=f1e485]:
                  - generic [ref=f1e487]:
                    - generic "Konferenzsprache" [ref=f1e488]:
                      - generic [aria-hidden] [ref=f1e489]: 
                      - generic [ref=f1e490]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e491]:
                      - generic [aria-hidden] [ref=f1e492]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e493]:
                    - generic [ref=f1e494]:
                      - heading "E2E Review Drafts Without Assistants" [level=3] [ref=f1e495]
                      - paragraph [ref=f1e496]: Schuster - Mann-Goodwin Konferenz
                    - generic [ref=f1e497]:
                      - generic [ref=f1e498]:
                        - generic [aria-hidden] [ref=f1e499]: 
                        - text: 7. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e500]:
                        - generic [aria-hidden] [ref=f1e501]: 
                        - text: Harmonytown
                    - generic [ref=f1e502]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e503]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Groups Rules Conference Christiansen - Hermann Konferenz 7. Dez. 2026 – 29. Dez. 2026 Fort Sydneytown Bewerben" [ref=f1e504] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000gra
                - figure [ref=f1e505]
                - generic [ref=f1e506]:
                  - generic [ref=f1e508]:
                    - generic "Konferenzsprache" [ref=f1e509]:
                      - generic [aria-hidden] [ref=f1e510]: 
                      - generic [ref=f1e511]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e512]:
                      - generic [aria-hidden] [ref=f1e513]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e514]:
                    - generic [ref=f1e515]:
                      - heading "E2E Groups Rules Conference" [level=3] [ref=f1e516]
                      - paragraph [ref=f1e517]: Christiansen - Hermann Konferenz
                    - generic [ref=f1e518]:
                      - generic [ref=f1e519]:
                        - generic [aria-hidden] [ref=f1e520]: 
                        - text: 7. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e521]:
                        - generic [aria-hidden] [ref=f1e522]: 
                        - text: Fort Sydneytown
                    - generic [ref=f1e523]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e524]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Messages Rules Conference Hilpert LLC Konferenz 7. Dez. 2026 – 30. Dez. 2026 Stamford Bewerben" [ref=f1e525] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000msa
                - figure [ref=f1e526]
                - generic [ref=f1e527]:
                  - generic [ref=f1e529]:
                    - generic "Konferenzsprache" [ref=f1e530]:
                      - generic [aria-hidden] [ref=f1e531]: 
                      - generic [ref=f1e532]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e533]:
                      - generic [aria-hidden] [ref=f1e534]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e535]:
                    - generic [ref=f1e536]:
                      - heading "E2E Messages Rules Conference" [level=3] [ref=f1e537]
                      - paragraph [ref=f1e538]: Hilpert LLC Konferenz
                    - generic [ref=f1e539]:
                      - generic [ref=f1e540]:
                        - generic [aria-hidden] [ref=f1e541]: 
                        - text: 7. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e542]:
                        - generic [aria-hidden] [ref=f1e543]: 
                        - text: Stamford
                    - generic [ref=f1e544]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e545]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E MCP Off Conference Reilly - Muller Konferenz 7. Dez. 2026 – 30. Dez. 2026 Hayward Bewerben" [ref=f1e546] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000011
                - figure [ref=f1e547]
                - generic [ref=f1e548]:
                  - generic [ref=f1e550]:
                    - generic "Konferenzsprache" [ref=f1e551]:
                      - generic [aria-hidden] [ref=f1e552]: 
                      - generic [ref=f1e553]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e554]:
                      - generic [aria-hidden] [ref=f1e555]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e556]:
                    - generic [ref=f1e557]:
                      - heading "E2E MCP Off Conference" [level=3] [ref=f1e558]
                      - paragraph [ref=f1e559]: Reilly - Muller Konferenz
                    - generic [ref=f1e560]:
                      - generic [ref=f1e561]:
                        - generic [aria-hidden] [ref=f1e562]: 
                        - text: 7. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e563]:
                        - generic [aria-hidden] [ref=f1e564]: 
                        - text: Hayward
                    - generic [ref=f1e565]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e566]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Prep Conference Tillman - Mertz Konferenz 7. Dez. 2026 – 28. Dez. 2026 Fort Dayne Bewerben" [ref=f1e567] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000002
                - figure [ref=f1e568]
                - generic [ref=f1e569]:
                  - generic [ref=f1e571]:
                    - generic "Konferenzsprache" [ref=f1e572]:
                      - generic [aria-hidden] [ref=f1e573]: 
                      - generic [ref=f1e574]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e575]:
                      - generic [aria-hidden] [ref=f1e576]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e577]:
                    - generic [ref=f1e578]:
                      - heading "E2E Prep Conference" [level=3] [ref=f1e579]
                      - paragraph [ref=f1e580]: Tillman - Mertz Konferenz
                    - generic [ref=f1e581]:
                      - generic [ref=f1e582]:
                        - generic [aria-hidden] [ref=f1e583]: 
                        - text: 7. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e584]:
                        - generic [aria-hidden] [ref=f1e585]: 
                        - text: Fort Dayne
                    - generic [ref=f1e586]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e587]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Paper Notifications Conference Dickinson, Mosciski and Reynolds Konferenz 8. Dez. 2026 – 29. Dez. 2026 Fort Ursulaport Bewerben" [ref=f1e588] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000pnt
                - figure [ref=f1e589]
                - generic [ref=f1e590]:
                  - generic [ref=f1e592]:
                    - generic "Konferenzsprache" [ref=f1e593]:
                      - generic [aria-hidden] [ref=f1e594]: 
                      - generic [ref=f1e595]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e596]:
                      - generic [aria-hidden] [ref=f1e597]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e598]:
                    - generic [ref=f1e599]:
                      - heading "E2E Paper Notifications Conference" [level=3] [ref=f1e600]
                      - paragraph [ref=f1e601]: Dickinson, Mosciski and Reynolds Konferenz
                    - generic [ref=f1e602]:
                      - generic [ref=f1e603]:
                        - generic [aria-hidden] [ref=f1e604]: 
                        - text: 8. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e605]:
                        - generic [aria-hidden] [ref=f1e606]: 
                        - text: Fort Ursulaport
                    - generic [ref=f1e607]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e608]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Guide A Cartwright, Konopelski and Harris-Langworth Konferenz 9. Dez. 2026 – 30. Dez. 2026 Lindchester Bewerben" [ref=f1e609] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000017
                - figure [ref=f1e610]
                - generic [ref=f1e611]:
                  - generic [ref=f1e613]:
                    - generic "Konferenzsprache" [ref=f1e614]:
                      - generic [aria-hidden] [ref=f1e615]: 
                      - generic [ref=f1e616]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e617]:
                      - generic [aria-hidden] [ref=f1e618]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e619]:
                    - generic [ref=f1e620]:
                      - heading "E2E Guide A" [level=3] [ref=f1e621]
                      - paragraph [ref=f1e622]: Cartwright, Konopelski and Harris-Langworth Konferenz
                    - generic [ref=f1e623]:
                      - generic [ref=f1e624]:
                        - generic [aria-hidden] [ref=f1e625]: 
                        - text: 9. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e626]:
                        - generic [aria-hidden] [ref=f1e627]: 
                        - text: Lindchester
                    - generic [ref=f1e628]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e629]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Messages Conference Morar - Champlin-Pfeffer Konferenz 9. Dez. 2026 – 28. Dez. 2026 South Lynnechester Bewerben" [ref=f1e630] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000msg
                - figure [ref=f1e631]
                - generic [ref=f1e632]:
                  - generic [ref=f1e634]:
                    - generic "Konferenzsprache" [ref=f1e635]:
                      - generic [aria-hidden] [ref=f1e636]: 
                      - generic [ref=f1e637]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e638]:
                      - generic [aria-hidden] [ref=f1e639]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e640]:
                    - generic [ref=f1e641]:
                      - heading "E2E Messages Conference" [level=3] [ref=f1e642]
                      - paragraph [ref=f1e643]: Morar - Champlin-Pfeffer Konferenz
                    - generic [ref=f1e644]:
                      - generic [ref=f1e645]:
                        - generic [aria-hidden] [ref=f1e646]: 
                        - text: 9. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e647]:
                        - generic [aria-hidden] [ref=f1e648]: 
                        - text: South Lynnechester
                    - generic [ref=f1e649]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e650]: 
  - contentinfo [ref=f1e652]:
    - navigation [ref=f1e653]:
      - link "Startseite" [ref=f1e654] [cursor=pointer]:
        - /url: /
      - link "Handbuch" [ref=f1e655] [cursor=pointer]:
        - /url: /docs/user-manual/participant/account#conference-overview
      - link "Impressum & Datenschutz" [ref=f1e656] [cursor=pointer]:
        - /url: https://dmun.de/legal
    - generic [ref=f1e657]:
      - generic [ref=f1e658]:
        - button "English" [ref=f1e659] [cursor=pointer]
        - button "Deutsch" [pressed] [ref=f1e662] [cursor=pointer]
      - button "Hoher Kontrast" [ref=f1e665] [cursor=pointer]:
        - generic [aria-hidden] [ref=f1e666]: 
        - text: Hoher Kontrast
    - navigation "Social Media" [ref=f1e667]:
      - generic [ref=f1e668]:
        - link "Instagram" [ref=f1e669] [cursor=pointer]:
          - /url: https://www.instagram.com/dmun_ev/
          - generic [aria-hidden] [ref=f1e670]: 
        - link "YouTube" [ref=f1e671] [cursor=pointer]:
          - /url: https://www.youtube.com/user/DeutscheMUNeV
          - generic [aria-hidden] [ref=f1e672]: 
        - link "GitHub" [ref=f1e673] [cursor=pointer]:
          - /url: https://github.com/deutschemodelunitednations
          - generic [aria-hidden] [ref=f1e674]: 
    - generic [ref=f1e675]:
      - paragraph [ref=f1e676]: Ein Service von
      - link "DMUN – Deutsche Model United Nations e.V.":
        - /url: https://dmun.de
        - img "DMUN – Deutsche Model United Nations e.V."
      - paragraph [ref=f1e677]: Copyright © 2024-2026 - Alle Rechte vorbehalten von Deutsche Model United Nations e.V.
      - generic [ref=f1e678]:
        - generic [ref=f1e679]:
          - generic [ref=f1e680]: "Version:"
          - generic [ref=f1e681]: nightly
        - generic [ref=f1e682]:
          - generic [ref=f1e683]: "SHA:"
          - generic [ref=f1e684]: unknown
```

# Test source

```ts
  39  | 		email: `${unique}@e2e.test`,
  40  | 		given_name: 'Testperson',
  41  | 		family_name: prefix,
  42  | 		preferred_username: unique,
  43  | 		locale: 'de',
  44  | 		...overrides
  45  | 	};
  46  | }
  47  | 
  48  | /**
  49  |  * The id as a name the `PersonName` scalar accepts, which allows no digits: each digit becomes a
  50  |  * letter, so ids that differ only in a digit (`…-member-1`, `…-member-2`) keep distinct names.
  51  |  */
  52  | function asPersonName(id: string): string {
  53  | 	return id.replace(/\d/g, (digit) => String.fromCharCode(65 + Number(digit)));
  54  | }
  55  | 
  56  | /**
  57  |  * Claims for a user with a fixed, predictable id - use this (instead of `makeTestUser`) whenever
  58  |  * a test needs the DB fixtures (TeamMember, DelegationMember, ...) seeded ahead of time in
  59  |  * e2e/seed/seed.ts, since those rows are created against a fixed userId that must match this
  60  |  * user's OIDC `sub`. `loginAs` signs in with `preferred_username` as the token's `sub`, so `id`
  61  |  * must be exactly the id used when seeding.
  62  |  */
  63  | export function fixedTestUser(id: string, overrides: Partial<TestUserClaims> = {}): TestUserClaims {
  64  | 	return {
  65  | 		email: `${id}@e2e.test`,
  66  | 		given_name: 'Testperson',
  67  | 		family_name: asPersonName(id),
  68  | 		preferred_username: id,
  69  | 		locale: 'de',
  70  | 		...overrides
  71  | 	};
  72  | }
  73  | 
  74  | /**
  75  |  * Path the oidc-mock provider lives under (`base_path` in oidc-mock.yaml), derived from the same
  76  |  * env var the app uses. Its Vite plugin serves the login page on the app's own origin and
  77  |  * rewrites the app's redirects to it into relative ones, so the provider is recognised by path,
  78  |  * not by origin.
  79  |  */
  80  | const OIDC_BASE_PATH = new URL(
  81  | 	(
  82  | 		process.env.PUBLIC_OIDC_AUTHORITY ??
  83  | 		'http://127.0.0.1:8090/oidc/.well-known/openid-configuration'
  84  | 	).replace(/\/\.well-known\/openid-configuration$/, '')
  85  | ).pathname;
  86  | 
  87  | /** True while `url` is on the mock OIDC provider rather than the app under test. */
  88  | function isOidcUrl(url: string | URL): boolean {
  89  | 	try {
  90  | 		const { pathname } = new URL(url.toString());
  91  | 		return pathname === OIDC_BASE_PATH || pathname.startsWith(`${OIDC_BASE_PATH}/`);
  92  | 	} catch {
  93  | 		return false;
  94  | 	}
  95  | }
  96  | 
  97  | /**
  98  |  * The session cookies of every sign in this worker made, by the claims it signed in with. Signing
  99  |  * in through the provider takes several page loads; the fixed users sign in dozens of times a run.
  100 |  */
  101 | const sessions = new Map<string, Cookie[]>();
  102 | 
  103 | /**
  104 |  * Signs in on the oidc-mock login page as `claims`, then - for a brand new user - completes the
  105 |  * mandatory "additional info" profile form the app requires before granting access to the rest
  106 |  * of the app. Ends with `page` navigated to `startUrl` (or wherever the app redirected to).
  107 |  *
  108 |  * A user this worker signed in before with the same claims gets that session back instead, and
  109 |  * goes through the provider again only if the app no longer accepts it.
  110 |  */
  111 | export async function loginAs(
  112 | 	page: Page,
  113 | 	claims: TestUserClaims,
  114 | 	opts: { startUrl?: string } = {}
  115 | ): Promise<void> {
  116 | 	// Through `/login`: a conference's dashboard and seat overview are public and never send a
  117 | 	// visitor to the provider on their own. With a valid session it redirects straight to `next`.
  118 | 	const startUrl = opts.startUrl ?? '/dashboard';
  119 | 	const sessionKey = JSON.stringify(claims);
  120 | 	const session = sessions.get(sessionKey);
  121 | 	// Whoever the page was signed in as before would otherwise pass `/login` straight through
  122 | 	await page.context().clearCookies();
  123 | 	if (session) await page.context().addCookies(session);
  124 | 	await page.goto(`/login?next=${encodeURIComponent(startUrl)}`);
  125 | 	if (session && !isOidcUrl(page.url())) {
  126 | 		await waitForHydration(page);
  127 | 		return;
  128 | 	}
  129 | 
  130 | 	await page.waitForURL((url) => isOidcUrl(url), { timeout: 15_000 });
  131 | 	// The page's "custom claims" form: any `sub`, any claims. Its per-user buttons are for the
  132 | 	// fixed accounts in oidc-mock.yaml, which the suite does not use. The form sits in a collapsed
  133 | 	// <details>, so it is opened first.
  134 | 	await page.getByText('Sign in with custom claims').click();
  135 | 	await page.locator('#custom_sub').fill(claims.preferred_username);
  136 | 	await page.locator('#custom_claims').fill(JSON.stringify(claims));
  137 | 	await page.locator('button[name="custom"]').click();
  138 | 
> 139 | 	await page.waitForURL((url) => !isOidcUrl(url), { timeout: 15_000 });
      |             ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  140 | 
  141 | 	if (new URL(page.url()).pathname.startsWith('/my-account')) {
  142 | 		await completeMandatoryProfile(page, claims);
  143 | 	}
  144 | 	sessions.set(
  145 | 		sessionKey,
  146 | 		(await page.context().cookies()).filter((cookie) => cookie.name.startsWith(SESSION_COOKIE))
  147 | 	);
  148 | 
  149 | 	// A returning fixed-actor user (see `fixedTestUser`) skips the /my-account detour entirely,
  150 | 	// landing straight on `startUrl` - which otherwise conveniently gives the page's JS bundle a
  151 | 	// few extra round trips to finish hydrating before a test's first real interaction. Without
  152 | 	// that buffer, an interaction fired immediately after this function returns can race
  153 | 	// SvelteKit's hydration (the click/input fires before the handler is attached and is lost).
  154 | 	await waitForHydration(page);
  155 | }
  156 | 
  157 | /**
  158 |  * `page.reload()` (or any fresh navigation) followed immediately by an interaction is prone to
  159 |  * the same hydration race as a fresh `loginAs` login (see the hydration wait there) - the
  160 |  * click/input can fire before Svelte's handler is attached. Use this after any `page.reload()`
  161 |  * a test does mid-flow, right before the next interaction.
  162 |  */
  163 | export async function waitForHydration(page: Page): Promise<void> {
  164 | 	// The root layout sets this in `onMount`. Not `networkidle`: the subscription stream stays open
  165 | 	// for as long as the page shows live data, so the network never goes idle on most pages.
  166 | 	await page.waitForFunction(() => document.body.dataset.hydrated === 'true', undefined, {
  167 | 		timeout: 15_000
  168 | 	});
  169 | }
  170 | 
  171 | /**
  172 |  * Fills the profile fields the app requires (see `#lib/schemata/userForm`), then saves.
  173 |  */
  174 | async function completeMandatoryProfile(page: Page, claims: TestUserClaims): Promise<void> {
  175 | 	// Input fired before hydration attaches the handlers is lost.
  176 | 	await waitForHydration(page);
  177 | 	// The legal name comes from `claims` (not a fixed literal) so tests that need to tell users
  178 | 	// apart by name (e.g. multiple delegation members in one table) still can - see
  179 | 	// delegation-member-management.spec.ts. Every field is overwritten, since a pre-seeded user
  180 | 	// (fixedTestUser fixtures) can already hold an invalid value.
  181 | 	await page.locator('input[name="given_name"]').fill(claims.given_name);
  182 | 	await page.locator('input[name="family_name"]').fill(claims.family_name);
  183 | 	await page.locator('input[name="phone"]').fill('+4917612345678');
  184 | 	await page.locator('input[name="street"]').fill('Teststraße 1');
  185 | 	await page.locator('input[name="zip"]').fill('24103');
  186 | 	await page.locator('input[name="city"]').fill('Kiel');
  187 | 	await page.locator('select[name="country"]').selectOption('DEU');
  188 | 	await page
  189 | 		.locator('textarea[name="emergencyContacts"]')
  190 | 		.fill('Emergency contact: +49 176 12345678');
  191 | 	// Seventeen this year unless the claims name another (`birthdate`, see `SUPERVISOR_AGE`):
  192 | 	// inside every conference's default range for participants, which an application has to fit
  193 | 	// to be sent (`applicationBlockers`), whenever the suite runs.
  194 | 	const birthday =
  195 | 		typeof claims.birthdate === 'string'
  196 | 			? claims.birthdate
  197 | 			: `${new Date().getFullYear() - 17}-05-05`;
  198 | 	await page.locator('input[name="birthday"]').fill(birthday);
  199 | 	await page.locator('select[name="foodPreference"]').selectOption('VEGAN');
  200 | 	// formsnap generates a random `id` per field (`useId()`), so fields are selected by `name`.
  201 | 	await page.locator('select[name="gender"]').selectOption('NO_STATEMENT');
  202 | 
  203 | 	const beforePath = new URL(page.url()).pathname;
  204 | 	const saveButton = page.locator('.card-body form button.btn-primary').first();
  205 | 	await expect(saveButton).toBeEnabled({ timeout: 5_000 });
  206 | 	await saveButton.click();
  207 | 	await page.waitForURL((url) => new URL(url).pathname !== beforePath, { timeout: 15_000 });
  208 | }
  209 | 
```