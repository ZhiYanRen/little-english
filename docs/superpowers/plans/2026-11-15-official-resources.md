# Official resource discovery and integration

User asks to find and import all 12 units' original videos and phrases, and has no files. Continue directly per the user's prior instruction. Explicitly reject bypassing publisher activation or republishing whole copyrighted lessons. This task adds public metadata and official access points, not copied videos/transcripts.

- [x] Read current project, inspect official public Level 2 catalogues, identify activation gate; avoid protected article/media URLs.
- [x] Verify all 12 unit catalogues: 56 video titles and 172 audio titles; verify 4 free official file links by HEAD without downloading archives.
- [x] Write and observe failing model test for the missing resource index; implement metadata refresher and verify model tests.
- [x] Write and observe failing browser test for an official-resources view. Add resources tab, first-use entry from book cards, honest activation states, and public sample/download links. Reuse current components and tokens; do not alter private materials or progress.
- [x] Exercise all 12 unit resource views, popup destination/opener, narrow tabs, existing import/study/audio/review flows; audit design contract and obtain independent review.
- [ ] Commit/push main, monitor Pages, verify the current online index and resource UI. No island update needed because name/logo/URL are unchanged.

Review focus: no activation bypass; public/free resources cannot be mislabeled as full textbook; resource metadata must never inflate private learning counts; four tabs must fit 320px; safe external links and unchanged legacy imports.
