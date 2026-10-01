# Victor Jimenez portfolio

Run `npm ci` and `npm run dev` for local development. Run `npm run build` and `npm run preview` to inspect the production build.

## CV

Edit `cv/career.json`, then regenerate both public download filenames:

```sh
uv venv .venv
uv pip install --python .venv/bin/python -r requirements-cv.txt
.venv/bin/python scripts/generate_cv.py
```

The generator embeds the Vera fonts bundled with the pinned ReportLab package and uses fixed document metadata. The current and legacy public CV URLs contain identical PDFs. The site presents Rootstack as the current employer and lists earlier roles without employer names.

## Project presentation

Professional examples in `src/data/projects.js` describe sector-based contributions delivered as part of project teams. They contain no client names, client links, dates, employer mappings or screenshots. Personal projects keep their public repository links. Professional examples are grouped by sector and are not a count of individual engagements.

Keep identifying details out of the page, project metadata, downloadable text, filenames and public assets. The build scan checks known historical client identities, including encoded and compact forms. The CV scan verifies extracted text from both aliases. These checks reduce accidental disclosure; they cannot establish contract permission, guarantee anonymity or erase previous public releases and Git history.

## Validation commands

```sh
npm run lint
npm run build
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

For browser verification, install the Playwright browsers with `npx playwright install chromium firefox webkit`, start `npm run preview -- --host 127.0.0.1 --port 4337`, and run `npm run test:browser` in another terminal. Screenshots and measurements are written to the ignored `evidence` directory.

Set `PORTFOLIO_BROWSER=firefox` or `PORTFOLIO_BROWSER=webkit` to run the same viewport and interaction matrix in those engines. Current project-presentation evidence is stored under `evidence/projects-chromium`, `evidence/projects-firefox` and `evidence/projects-webkit`.

Set `PORTFOLIO_URL` to test a deployed site and `PORTFOLIO_EVIDENCE_DIR` to keep its captures separate from local verification.

The root `design-evidence.json` and `local-design-evidence.json` describe the earlier redesign. The preceding CV refresh results are in `evidence/browser/verification.json`, with additional checks in `evidence/browser/additional-checks.json` and PDF page renders in `evidence/pdf`.

Production deployment runs when `main` is pushed. A local branch does not update the live portfolio.
