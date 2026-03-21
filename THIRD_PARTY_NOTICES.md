# Third Party Notices

This project was developed with reference to the following open-source projects:

## vercel-labs/agent-browser

- Repository: <https://github.com/vercel-labs/agent-browser>
- License: Apache-2.0
- Used for: the integration model where the AI side discovers and connects to a running Chrome instance with `--auto-connect`

## ruifigueira/playwright-crx

- Repository: <https://github.com/ruifigueira/playwright-crx>
- License: Apache-2.0
- Used for: design reference around `chrome.debugger` attachment and transport patterns inside Chrome extensions

## checkly/headless-recorder

- Repository: <https://github.com/checkly/headless-recorder>
- License: MIT
- Used for: design reference around structured recorder events and browser event capture flow

## Modification Note

The code in this repository is a new implementation shaped by the projects above. Where concepts or structure were adapted, they were rewritten to fit this extension's narrower target-based browser bridge model.
