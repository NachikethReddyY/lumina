# CA1 DBS Documentation - Version 1

## Ideation Links
The following links are for ideation and reference for this project:

- [290426 Ideation 1](https://claude.ai/share/754dbfbb-07a7-4c45-9d35-cdfbd87aadf7)
- [290426 Ideation 2](https://chatgpt.com/share/69f1b929-6070-8321-a640-d0750bba8fb2)

## Design
- **Stitch Design File:** [https://stitch.withgoogle.com/projects/6870326933602496338](https://stitch.withgoogle.com/projects/6870326933602496338)

## Logs
- **29 April 2026:**
  - **Issue:** `axios` not installed. Vite failed to resolve import in `src/utils/apiClient.ts`.
  - **Error:** `Failed to resolve import "axios" from "src/utils/apiClient.ts". Does the file exist?`
  - **Resolution:** Run `npm install axios` in the project root.
- **30 April 2026:**
  - **Action:** Installed Material UI and its dependencies for frontend styling.
  - **Command:** `npm install @mui/material @emotion/react @emotion/styled`
  - **Research:** Researched OAuth 2.0 required fields (https://oauth.net/2/). Key fields for Authorization Code flow include `response_type`, `client_id`, `redirect_uri`, and `grant_type`.
