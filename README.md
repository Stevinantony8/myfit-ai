# MYFIT AI — Phase 7

Personal Wellness & Fitness Planner — static, client-side application.

## Phase 7 additions

- Privacy and data-control hardening
- `Delete My Data`
- `Delete photo`
- Safer browser-local-storage wording
- Graceful localStorage quota handling
- Pregnancy/postpartum screening
- Significant medical-condition screening
- Eating-disorder concern screening
- Injury/medical-concern guidance
- Extreme-timeline safety handling
- Responsive safety-check UI
- Focus-visible accessibility styling
- Reduced-motion support
- Eight requested persona tests plus safety regression tests

## Architecture

The application remains modular:

- `index.html` — application shell
- `css/styles.css` — design system and responsive styles
- `js/app.js` — UI state and orchestration
- `js/calculations.js` — BMI/BMR/TDEE/timeline logic
- `js/recommendations.js` — nutrition, workout and roadmap engines
- `js/storage.js` — browser-local persistence
- `js/presentation.js` — presentation mode
- `js/report.js` — local report/print workflow
- `data/foods.js` — structured food dataset
- `data/exercises.js` — structured exercise dataset

## Privacy note

This build stores profile, plan, progress and optional photo data in the browser's local storage. The application itself does not transmit that data to a MYFIT AI server. Browser/OS backup behavior, browser extensions, and other software outside the application are not controlled by MYFIT AI.

## Run locally

Use a local web server because the application uses ES modules:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Safety scope

MYFIT AI is a wellness planning tool, not a diagnosis or treatment system. It does not analyze photos for BMI, body fat, obesity or medical conditions. When significant safety concerns are flagged, personalized nutrition targets and exercise programming are limited and professional guidance is recommended.
