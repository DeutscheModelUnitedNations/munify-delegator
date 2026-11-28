# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: team/attendance-check.spec.ts >> a session that only records checks nothing
- Location: e2e/team/attendance-check.spec.ts:112:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: {"checkPassed": null}
Received: undefined
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
            - button "Testperson eCe-attendance-care" [ref=f1e28] [cursor=pointer]:
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
          - 'link "Teammitglied · Teilnehmendenbetreuung Konferenzsprache: Deutsch Läuft gerade E2E Attendance Conference Effertz Group Konferenz 23. Nov. 2026 – 27. Nov. 2026 Gordonview Zur Übersicht" [ref=f1e46] [cursor=pointer]':
            - /url: /dashboard/e2e00000conference0000006
            - figure [ref=f1e47]
            - generic [ref=f1e48]:
              - generic [ref=f1e49]:
                - generic [ref=f1e50]:
                  - generic [aria-hidden] [ref=f1e51]: 
                  - text: Teammitglied · Teilnehmendenbetreuung
                - generic [ref=f1e52]:
                  - generic "Konferenzsprache" [ref=f1e53]:
                    - generic [aria-hidden] [ref=f1e54]: 
                    - generic [ref=f1e55]: "Konferenzsprache:"
                    - text: Deutsch
                  - generic [ref=f1e56]:
                    - generic [aria-hidden] [ref=f1e57]: 
                    - text: Läuft gerade
              - generic [ref=f1e58]:
                - generic [ref=f1e59]:
                  - heading "E2E Attendance Conference" [level=3] [ref=f1e60]
                  - paragraph [ref=f1e61]: Effertz Group Konferenz
                - generic [ref=f1e62]:
                  - generic [ref=f1e63]:
                    - generic [aria-hidden] [ref=f1e64]: 
                    - text: 23. Nov. 2026 – 27. Nov. 2026
                  - generic [ref=f1e65]:
                    - generic [aria-hidden] [ref=f1e66]: 
                    - text: Gordonview
                - generic [ref=f1e67]:
                  - text: Zur Übersicht
                  - generic [aria-hidden] [ref=f1e68]: 
        - generic [ref=f1e69]:
          - generic [ref=f1e70]:
            - generic [ref=f1e71]:
              - heading "Bewerbung offen" [level=3] [ref=f1e72]:
                - generic [aria-hidden] [ref=f1e73]: 
                - text: Bewerbung offen
              - generic [ref=f1e74]: "3"
            - generic [ref=f1e76]:
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E Seats Conference Altenwerth, Frami and Borer Konferenz 6. Dez. 2026 – 27. Dez. 2026 Rohanchester Zur Übersicht" [ref=f1e77] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000005
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
                      - heading "E2E Seats Conference" [level=3] [ref=f1e89]
                      - paragraph [ref=f1e90]: Altenwerth, Frami and Borer Konferenz
                    - generic [ref=f1e91]:
                      - generic [ref=f1e92]:
                        - generic [aria-hidden] [ref=f1e93]: 
                        - text: 6. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e94]:
                        - generic [aria-hidden] [ref=f1e95]: 
                        - text: Rohanchester
                    - generic [ref=f1e96]:
                      - text: Zur Übersicht
                      - generic [aria-hidden] [ref=f1e97]: 
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E School Conference Leffler Group Konferenz 9. Dez. 2026 – 30. Dez. 2026 East Lyric Zur Übersicht" [ref=f1e98] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000012
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
                      - heading "E2E School Conference" [level=3] [ref=f1e110]
                      - paragraph [ref=f1e111]: Leffler Group Konferenz
                    - generic [ref=f1e112]:
                      - generic [ref=f1e113]:
                        - generic [aria-hidden] [ref=f1e114]: 
                        - text: 9. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e115]:
                        - generic [aria-hidden] [ref=f1e116]: 
                        - text: East Lyric
                    - generic [ref=f1e117]:
                      - text: Zur Übersicht
                      - generic [aria-hidden] [ref=f1e118]: 
              - 'link "Konferenzsprache: Deutsch Bewerbung offen E2E Test Conference Zboncak and Sons Konferenz 24. Jan. 2027 – 27. Jan. 2027 Hegmann-McCulloughborough Bewerben" [ref=f1e119] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000001
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
                      - heading "E2E Test Conference" [level=3] [ref=f1e131]
                      - paragraph [ref=f1e132]: Zboncak and Sons Konferenz
                    - generic [ref=f1e133]:
                      - generic [ref=f1e134]:
                        - generic [aria-hidden] [ref=f1e135]: 
                        - text: 24. Jan. 2027 – 27. Jan. 2027
                      - generic [ref=f1e136]:
                        - generic [aria-hidden] [ref=f1e137]: 
                        - text: Hegmann-McCulloughborough
                    - generic [ref=f1e138]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e139]: 
          - generic [ref=f1e140]:
            - generic [ref=f1e141]:
              - heading "In Vorbereitung" [level=3] [ref=f1e142]:
                - generic [aria-hidden] [ref=f1e143]: 
                - text: In Vorbereitung
              - generic [ref=f1e144]: "21"
            - generic [ref=f1e146]:
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Prep Conference Waters, Dickens and Daniel Konferenz 2. Dez. 2026 – 26. Dez. 2026 Harrisburg Bewerben" [ref=f1e147] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000002
                - figure [ref=f1e148]
                - generic [ref=f1e149]:
                  - generic [ref=f1e151]:
                    - generic "Konferenzsprache" [ref=f1e152]:
                      - generic [aria-hidden] [ref=f1e153]: 
                      - generic [ref=f1e154]: "Konferenzsprache:"
                      - text: Deutsch
                    - generic [ref=f1e155]:
                      - generic [aria-hidden] [ref=f1e156]: 
                      - text: In Vorbereitung
                  - generic [ref=f1e157]:
                    - generic [ref=f1e158]:
                      - heading "E2E Prep Conference" [level=3] [ref=f1e159]
                      - paragraph [ref=f1e160]: Waters, Dickens and Daniel Konferenz
                    - generic [ref=f1e161]:
                      - generic [ref=f1e162]:
                        - generic [aria-hidden] [ref=f1e163]: 
                        - text: 2. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e164]:
                        - generic [aria-hidden] [ref=f1e165]: 
                        - text: Harrisburg
                    - generic [ref=f1e166]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e167]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Unreleased Conference Rau - Morar Konferenz 2. Dez. 2026 – 29. Dez. 2026 West Nedside Bewerben" [ref=f1e168] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000004
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
                      - heading "E2E Unreleased Conference" [level=3] [ref=f1e180]
                      - paragraph [ref=f1e181]: Rau - Morar Konferenz
                    - generic [ref=f1e182]:
                      - generic [ref=f1e183]:
                        - generic [aria-hidden] [ref=f1e184]: 
                        - text: 2. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e185]:
                        - generic [aria-hidden] [ref=f1e186]: 
                        - text: West Nedside
                    - generic [ref=f1e187]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e188]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Messages Conference Schaefer LLC Konferenz 3. Dez. 2026 – 26. Dez. 2026 Port Chazbury Bewerben" [ref=f1e189] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000msg
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
                      - heading "E2E Messages Conference" [level=3] [ref=f1e201]
                      - paragraph [ref=f1e202]: Schaefer LLC Konferenz
                    - generic [ref=f1e203]:
                      - generic [ref=f1e204]:
                        - generic [aria-hidden] [ref=f1e205]: 
                        - text: 3. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e206]:
                        - generic [aria-hidden] [ref=f1e207]: 
                        - text: Port Chazbury
                    - generic [ref=f1e208]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e209]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Review Drafts Without Assistants Quigley - Prosacco Konferenz 4. Dez. 2026 – 29. Dez. 2026 West Stephanborough Bewerben" [ref=f1e210] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000016
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
                      - heading "E2E Review Drafts Without Assistants" [level=3] [ref=f1e222]
                      - paragraph [ref=f1e223]: Quigley - Prosacco Konferenz
                    - generic [ref=f1e224]:
                      - generic [ref=f1e225]:
                        - generic [aria-hidden] [ref=f1e226]: 
                        - text: 4. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e227]:
                        - generic [aria-hidden] [ref=f1e228]: 
                        - text: West Stephanborough
                    - generic [ref=f1e229]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e230]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Notifications Conference McKenzie Inc Konferenz 4. Dez. 2026 – 27. Dez. 2026 Passaic Bewerben" [ref=f1e231] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000ntf
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
                      - heading "E2E Notifications Conference" [level=3] [ref=f1e243]
                      - paragraph [ref=f1e244]: McKenzie Inc Konferenz
                    - generic [ref=f1e245]:
                      - generic [ref=f1e246]:
                        - generic [aria-hidden] [ref=f1e247]: 
                        - text: 4. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e248]:
                        - generic [aria-hidden] [ref=f1e249]: 
                        - text: Passaic
                    - generic [ref=f1e250]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e251]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Document Numbers Conference Heidenreich, Kautzer and Reynolds Konferenz 5. Dez. 2026 – 27. Dez. 2026 Chapel Hill Bewerben" [ref=f1e252] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000019
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
                      - heading "E2E Document Numbers Conference" [level=3] [ref=f1e264]
                      - paragraph [ref=f1e265]: Heidenreich, Kautzer and Reynolds Konferenz
                    - generic [ref=f1e266]:
                      - generic [ref=f1e267]:
                        - generic [aria-hidden] [ref=f1e268]: 
                        - text: 5. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e269]:
                        - generic [aria-hidden] [ref=f1e270]: 
                        - text: Chapel Hill
                    - generic [ref=f1e271]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e272]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Invitations Conference Rippin - Gleichner Konferenz 5. Dez. 2026 – 29. Dez. 2026 Coleland Bewerben" [ref=f1e273] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000020
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
                      - heading "E2E Invitations Conference" [level=3] [ref=f1e285]
                      - paragraph [ref=f1e286]: Rippin - Gleichner Konferenz
                    - generic [ref=f1e287]:
                      - generic [ref=f1e288]:
                        - generic [aria-hidden] [ref=f1e289]: 
                        - text: 5. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e290]:
                        - generic [aria-hidden] [ref=f1e291]: 
                        - text: Coleland
                    - generic [ref=f1e292]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e293]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Email Pace Conference Cronin, Schumm and Murazik Konferenz 5. Dez. 2026 – 27. Dez. 2026 South Lewis Bewerben" [ref=f1e294] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000007
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
                      - heading "E2E Email Pace Conference" [level=3] [ref=f1e306]
                      - paragraph [ref=f1e307]: Cronin, Schumm and Murazik Konferenz
                    - generic [ref=f1e308]:
                      - generic [ref=f1e309]:
                        - generic [aria-hidden] [ref=f1e310]: 
                        - text: 5. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e311]:
                        - generic [aria-hidden] [ref=f1e312]: 
                        - text: South Lewis
                    - generic [ref=f1e313]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e314]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Announcements Rules Conference Bernier - Murazik Konferenz 5. Dez. 2026 – 29. Dez. 2026 Lake Kiaraland Bewerben" [ref=f1e315] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000ana
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
                      - heading "E2E Announcements Rules Conference" [level=3] [ref=f1e327]
                      - paragraph [ref=f1e328]: Bernier - Murazik Konferenz
                    - generic [ref=f1e329]:
                      - generic [ref=f1e330]:
                        - generic [aria-hidden] [ref=f1e331]: 
                        - text: 5. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e332]:
                        - generic [aria-hidden] [ref=f1e333]: 
                        - text: Lake Kiaraland
                    - generic [ref=f1e334]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e335]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Announcements Conference Johns LLC Konferenz 6. Dez. 2026 – 27. Dez. 2026 Maggiofort Bewerben" [ref=f1e336] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000anu
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
                      - heading "E2E Announcements Conference" [level=3] [ref=f1e348]
                      - paragraph [ref=f1e349]: Johns LLC Konferenz
                    - generic [ref=f1e350]:
                      - generic [ref=f1e351]:
                        - generic [aria-hidden] [ref=f1e352]: 
                        - text: 6. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e353]:
                        - generic [aria-hidden] [ref=f1e354]: 
                        - text: Maggiofort
                    - generic [ref=f1e355]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e356]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Second Paper Conference Swaniawski - Trantow Konferenz 7. Dez. 2026 – 29. Dez. 2026 Oswaldostead Bewerben" [ref=f1e357] [cursor=pointer]':
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
                      - heading "E2E Second Paper Conference" [level=3] [ref=f1e369]
                      - paragraph [ref=f1e370]: Swaniawski - Trantow Konferenz
                    - generic [ref=f1e371]:
                      - generic [ref=f1e372]:
                        - generic [aria-hidden] [ref=f1e373]: 
                        - text: 7. Dez. 2026 – 29. Dez. 2026
                      - generic [ref=f1e374]:
                        - generic [aria-hidden] [ref=f1e375]: 
                        - text: Oswaldostead
                    - generic [ref=f1e376]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e377]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E MCP Off Conference Huels Inc Konferenz 7. Dez. 2026 – 26. Dez. 2026 Nakiachester Bewerben" [ref=f1e378] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000011
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
                      - heading "E2E MCP Off Conference" [level=3] [ref=f1e390]
                      - paragraph [ref=f1e391]: Huels Inc Konferenz
                    - generic [ref=f1e392]:
                      - generic [ref=f1e393]:
                        - generic [aria-hidden] [ref=f1e394]: 
                        - text: 7. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e395]:
                        - generic [aria-hidden] [ref=f1e396]: 
                        - text: Nakiachester
                    - generic [ref=f1e397]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e398]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Conference Papers Unreleased Shanahan - Franey Konferenz 8. Dez. 2026 – 26. Dez. 2026 Stoltenbergburgh Bewerben" [ref=f1e399] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000014
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
                      - heading "E2E Conference Papers Unreleased" [level=3] [ref=f1e411]
                      - paragraph [ref=f1e412]: Shanahan - Franey Konferenz
                    - generic [ref=f1e413]:
                      - generic [ref=f1e414]:
                        - generic [aria-hidden] [ref=f1e415]: 
                        - text: 8. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e416]:
                        - generic [aria-hidden] [ref=f1e417]: 
                        - text: Stoltenbergburgh
                    - generic [ref=f1e418]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e419]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Messages Rules Conference Bergnaum, Blick and Raynor Konferenz 8. Dez. 2026 – 28. Dez. 2026 Niagara Falls Bewerben" [ref=f1e420] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000msa
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
                      - heading "E2E Messages Rules Conference" [level=3] [ref=f1e432]
                      - paragraph [ref=f1e433]: Bergnaum, Blick and Raynor Konferenz
                    - generic [ref=f1e434]:
                      - generic [ref=f1e435]:
                        - generic [aria-hidden] [ref=f1e436]: 
                        - text: 8. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e437]:
                        - generic [aria-hidden] [ref=f1e438]: 
                        - text: Niagara Falls
                    - generic [ref=f1e439]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e440]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Late Supervisor Conference Carroll Inc Konferenz 8. Dez. 2026 – 28. Dez. 2026 North Jordonburgh Bewerben" [ref=f1e441] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000008
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
                      - heading "E2E Late Supervisor Conference" [level=3] [ref=f1e453]
                      - paragraph [ref=f1e454]: Carroll Inc Konferenz
                    - generic [ref=f1e455]:
                      - generic [ref=f1e456]:
                        - generic [aria-hidden] [ref=f1e457]: 
                        - text: 8. Dez. 2026 – 28. Dez. 2026
                      - generic [ref=f1e458]:
                        - generic [aria-hidden] [ref=f1e459]: 
                        - text: North Jordonburgh
                    - generic [ref=f1e460]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e461]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Conference Papers Watsica and Sons Konferenz 8. Dez. 2026 – 26. Dez. 2026 East Clarence Bewerben" [ref=f1e462] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000013
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
                      - heading "E2E Conference Papers" [level=3] [ref=f1e474]
                      - paragraph [ref=f1e475]: Watsica and Sons Konferenz
                    - generic [ref=f1e476]:
                      - generic [ref=f1e477]:
                        - generic [aria-hidden] [ref=f1e478]: 
                        - text: 8. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e479]:
                        - generic [aria-hidden] [ref=f1e480]: 
                        - text: East Clarence
                    - generic [ref=f1e481]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e482]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Review Drafts Ortiz - Gerhold Konferenz 8. Dez. 2026 – 30. Dez. 2026 Schinnerborough Bewerben" [ref=f1e483] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000015
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
                      - heading "E2E Review Drafts" [level=3] [ref=f1e495]
                      - paragraph [ref=f1e496]: Ortiz - Gerhold Konferenz
                    - generic [ref=f1e497]:
                      - generic [ref=f1e498]:
                        - generic [aria-hidden] [ref=f1e499]: 
                        - text: 8. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e500]:
                        - generic [aria-hidden] [ref=f1e501]: 
                        - text: Schinnerborough
                    - generic [ref=f1e502]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e503]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Postal Guide Conference Hartmann, Rolfson and Jast Konferenz 8. Dez. 2026 – 26. Dez. 2026 Lake Blakeport Bewerben" [ref=f1e504] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000pgd
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
                      - heading "E2E Postal Guide Conference" [level=3] [ref=f1e516]
                      - paragraph [ref=f1e517]: Hartmann, Rolfson and Jast Konferenz
                    - generic [ref=f1e518]:
                      - generic [ref=f1e519]:
                        - generic [aria-hidden] [ref=f1e520]: 
                        - text: 8. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e521]:
                        - generic [aria-hidden] [ref=f1e522]: 
                        - text: Lake Blakeport
                    - generic [ref=f1e523]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e524]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Paper Scanning Conference Goodwin-Koepp, Ondricka and Cormier Konferenz 8. Dez. 2026 – 30. Dez. 2026 Pearlport Bewerben" [ref=f1e525] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000017
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
                      - heading "E2E Paper Scanning Conference" [level=3] [ref=f1e537]
                      - paragraph [ref=f1e538]: Goodwin-Koepp, Ondricka and Cormier Konferenz
                    - generic [ref=f1e539]:
                      - generic [ref=f1e540]:
                        - generic [aria-hidden] [ref=f1e541]: 
                        - text: 8. Dez. 2026 – 30. Dez. 2026
                      - generic [ref=f1e542]:
                        - generic [aria-hidden] [ref=f1e543]: 
                        - text: Pearlport
                    - generic [ref=f1e544]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e545]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E MCP Conference Kunze, Hoeger and D''Amore Konferenz 9. Dez. 2026 – 27. Dez. 2026 Whitestead Bewerben" [ref=f1e546] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000010
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
                      - heading "E2E MCP Conference" [level=3] [ref=f1e558]
                      - paragraph [ref=f1e559]: Kunze, Hoeger and D'Amore Konferenz
                    - generic [ref=f1e560]:
                      - generic [ref=f1e561]:
                        - generic [aria-hidden] [ref=f1e562]: 
                        - text: 9. Dez. 2026 – 27. Dez. 2026
                      - generic [ref=f1e563]:
                        - generic [aria-hidden] [ref=f1e564]: 
                        - text: Whitestead
                    - generic [ref=f1e565]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e566]: 
              - 'link "Konferenzsprache: Deutsch In Vorbereitung E2E Paper Notifications Conference Koss, Metz and Hansen Konferenz 9. Dez. 2026 – 26. Dez. 2026 Covina Bewerben" [ref=f1e567] [cursor=pointer]':
                - /url: /dashboard/e2e00000conference0000pnt
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
                      - heading "E2E Paper Notifications Conference" [level=3] [ref=f1e579]
                      - paragraph [ref=f1e580]: Koss, Metz and Hansen Konferenz
                    - generic [ref=f1e581]:
                      - generic [ref=f1e582]:
                        - generic [aria-hidden] [ref=f1e583]: 
                        - text: 9. Dez. 2026 – 26. Dez. 2026
                      - generic [ref=f1e584]:
                        - generic [aria-hidden] [ref=f1e585]: 
                        - text: Covina
                    - generic [ref=f1e586]:
                      - text: Bewerben
                      - generic [aria-hidden] [ref=f1e587]: 
  - contentinfo [ref=f1e589]:
    - navigation [ref=f1e590]:
      - link "Startseite" [ref=f1e591] [cursor=pointer]:
        - /url: /
      - link "Handbuch" [ref=f1e592] [cursor=pointer]:
        - /url: /docs/user-manual/participant/account#conference-overview
      - link "Impressum & Datenschutz" [ref=f1e593] [cursor=pointer]:
        - /url: https://dmun.de/legal
    - generic [ref=f1e594]:
      - generic [ref=f1e595]:
        - button "English" [ref=f1e596] [cursor=pointer]
        - button "Deutsch" [pressed] [ref=f1e599] [cursor=pointer]
      - button "Hoher Kontrast" [ref=f1e602] [cursor=pointer]:
        - generic [aria-hidden] [ref=f1e603]: 
        - text: Hoher Kontrast
    - navigation "Social Media" [ref=f1e604]:
      - generic [ref=f1e605]:
        - link "Instagram" [ref=f1e606] [cursor=pointer]:
          - /url: https://www.instagram.com/dmun_ev/
          - generic [aria-hidden] [ref=f1e607]: 
        - link "YouTube" [ref=f1e608] [cursor=pointer]:
          - /url: https://www.youtube.com/user/DeutscheMUNeV
          - generic [aria-hidden] [ref=f1e609]: 
        - link "GitHub" [ref=f1e610] [cursor=pointer]:
          - /url: https://github.com/deutschemodelunitednations
          - generic [aria-hidden] [ref=f1e611]: 
    - generic [ref=f1e612]:
      - paragraph [ref=f1e613]: Ein Service von
      - link [ref=f1e614] [cursor=pointer]:
        - /url: https://dmun.de
        - img "DMUN – Deutsche Model United Nations e.V." [ref=f1e615]
      - paragraph [ref=f1e616]: Copyright © 2024-2026 - Alle Rechte vorbehalten von Deutsche Model United Nations e.V.
      - generic [ref=f1e617]:
        - generic [ref=f1e618]:
          - generic [ref=f1e619]: "Version:"
          - generic [ref=f1e620]: nightly
        - generic [ref=f1e621]:
          - generic [ref=f1e622]: "SHA:"
          - generic [ref=f1e623]: unknown
```

# Test source

```ts
  15  | 	errors?: { message: string; extensions?: { code?: string } }[];
  16  | };
  17  | 
  18  | async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
  19  | 	const res = await page.request.post('/api/graphql', {
  20  | 		headers: { 'x-locale': 'en' },
  21  | 		data: { query, variables }
  22  | 	});
  23  | 	return (await res.json()) as GraphQLResult;
  24  | }
  25  | 
  26  | const conferenceId = E2E_ATTENDANCE_CONFERENCE_ID;
  27  | 
  28  | async function startSession(page: Page, mode: 'CHECK' | 'RECORD' | 'BADGE') {
  29  | 	const id = crypto.randomUUID();
  30  | 	const result = await gql(
  31  | 		page,
  32  | 		`mutation ($id: ID!, $c: ID!, $o: String!, $mode: AttendancesessionmodeEnum!) {
  33  | 			startAttendanceSession(id: $id, conferenceId: $c, occasion: $o, mode: $mode) { id }
  34  | 		}`,
  35  | 		{ id, c: conferenceId, o: `Check ${id.slice(0, 8)}`, mode }
  36  | 	);
  37  | 	expect(result.errors, JSON.stringify(result)).toBeUndefined();
  38  | 	return id;
  39  | }
  40  | 
  41  | const lookup = (page: Page, sessionId: string) =>
  42  | 	gql(
  43  | 		page,
  44  | 		`query ($c: ID!, $code: String!, $s: ID) {
  45  | 			scanLookup(conferenceId: $c, code: $code, sessionId: $s, asScan: true) {
  46  | 				issues checkPassed mayRecordAnyway
  47  | 			}
  48  | 		}`,
  49  | 		{ c: conferenceId, code: E2E_ATTENDANCE_ADA_ID, s: sessionId }
  50  | 	);
  51  | 
  52  | const record = (page: Page, sessionId: string) =>
  53  | 	gql(
  54  | 		page,
  55  | 		`mutation ($u: ID!, $c: ID!, $s: ID!) {
  56  | 			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s) { checkPassed }
  57  | 		}`,
  58  | 		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId }
  59  | 	);
  60  | 
  61  | /** Records Ada's scan, handing her the card. */
  62  | const recordCard = (page: Page, sessionId: string, accessCardId: string) =>
  63  | 	gql(
  64  | 		page,
  65  | 		`mutation ($u: ID!, $c: ID!, $s: ID!, $card: String!) {
  66  | 			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s, accessCardId: $card) {
  67  | 				id checkPassed
  68  | 			}
  69  | 		}`,
  70  | 		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId, card: accessCardId }
  71  | 	);
  72  | 
  73  | /** The card Ada carries, as a session's lookup tells it. */
  74  | async function adasCard(page: Page, sessionId: string) {
  75  | 	const result = await gql(
  76  | 		page,
  77  | 		`query ($c: ID!, $code: String!, $s: ID) {
  78  | 			scanLookup(conferenceId: $c, code: $code, sessionId: $s) { accessCardId }
  79  | 		}`,
  80  | 		{ c: conferenceId, code: E2E_ATTENDANCE_ADA_ID, s: sessionId }
  81  | 	);
  82  | 	expect(result.errors, JSON.stringify(result)).toBeUndefined();
  83  | 	return result.data?.scanLookup?.accessCardId;
  84  | }
  85  | 
  86  | test.beforeEach(async ({ page }) => {
  87  | 	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_CARE_ID));
  88  | });
  89  | 
  90  | test('a checking session stores the verdict the server reaches', async ({ page }) => {
  91  | 	const sessionId = await startSession(page, 'CHECK');
  92  | 
  93  | 	const first = await lookup(page, sessionId);
  94  | 	expect(first.data?.scanLookup).toMatchObject({
  95  | 		issues: ['paymentOpen', 'termsOpen'],
  96  | 		checkPassed: false,
  97  | 		mayRecordAnyway: true
  98  | 	});
  99  | 
  100 | 	const recorded = await record(page, sessionId);
  101 | 	expect(recorded.data?.createAttendanceEntry).toEqual({ checkPassed: false });
  102 | 
  103 | 	// Scanned again, the earlier scan is open too, and that one cannot be overridden
  104 | 	const again = await lookup(page, sessionId);
  105 | 	expect(again.data?.scanLookup).toMatchObject({
  106 | 		issues: ['paymentOpen', 'termsOpen', 'alreadyScanned'],
  107 | 		checkPassed: false,
  108 | 		mayRecordAnyway: false
  109 | 	});
  110 | });
  111 | 
  112 | test('a session that only records checks nothing', async ({ page }) => {
  113 | 	const sessionId = await startSession(page, 'RECORD');
  114 | 	const recorded = await record(page, sessionId);
> 115 | 	expect(recorded.data?.createAttendanceEntry).toEqual({ checkPassed: null });
      |                                               ^ Error: expect(received).toEqual(expected) // deep equality
  116 | });
  117 | 
  118 | test('the scanner cannot hand in a verdict of its own', async ({ page }) => {
  119 | 	const sessionId = await startSession(page, 'CHECK');
  120 | 	const result = await gql(
  121 | 		page,
  122 | 		`mutation ($u: ID!, $c: ID!, $s: ID!) {
  123 | 			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s, checkPassed: true) { id }
  124 | 		}`,
  125 | 		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId }
  126 | 	);
  127 | 	expect(result.errors?.[0]?.message).toMatch(/checkPassed/);
  128 | });
  129 | 
  130 | test('a badge session stores the card with the scan, and a second scan replaces it', async ({
  131 | 	page
  132 | }) => {
  133 | 	const sessionId = await startSession(page, 'BADGE');
  134 | 	const card = `CARD-${sessionId.slice(0, 8)}`;
  135 | 
  136 | 	const first = await recordCard(page, sessionId, ` ${card} `);
  137 | 	expect(first.data?.createAttendanceEntry).toMatchObject({ checkPassed: false });
  138 | 	expect(await adasCard(page, sessionId)).toBe(card);
  139 | 
  140 | 	const again = await recordCard(page, sessionId, `${card}-2`);
  141 | 	expect(again.data?.createAttendanceEntry?.id).toBe(first.data?.createAttendanceEntry?.id);
  142 | 	expect(await adasCard(page, sessionId)).toBe(`${card}-2`);
  143 | 
  144 | 	// told only where cards are handed out
  145 | 	expect(await adasCard(page, await startSession(page, 'CHECK'))).toBeNull();
  146 | });
  147 | 
  148 | test('a badge session takes no scan without a card, and no other session takes one', async ({
  149 | 	page
  150 | }) => {
  151 | 	const badge = await startSession(page, 'BADGE');
  152 | 	const without = await record(page, badge);
  153 | 	expect(without.errors?.[0]?.extensions?.code, JSON.stringify(without)).toBe('INVALID_INPUT');
  154 | 	const blank = await recordCard(page, badge, '  ');
  155 | 	expect(blank.errors?.[0]?.extensions?.code, JSON.stringify(blank)).toBe('INVALID_INPUT');
  156 | 
  157 | 	for (const mode of ['CHECK', 'RECORD'] as const) {
  158 | 		const result = await recordCard(page, await startSession(page, mode), 'CARD');
  159 | 		expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe('INVALID_INPUT');
  160 | 	}
  161 | });
  162 | 
```