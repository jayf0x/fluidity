## Final Cleanup and quality assessment

Go through the readme and core files and see where there are inconsistencies, possible big improvements, bugs...

RULES

- document all issues or improvements you find as a backlog.md item
- optionally add a `// TODO: [backlog-item-name]` where you found the issue
- do not waste tokens or energy on being too precise or too perfect. You can loosely reference what the bug is and where it can be found, no need to be too detailed. use caveman like pragmatism.

## BUG/CORE: better typing for `DEFAULT_PROPS`

File: src/core/config.ts

const `DEFAULT_PROPS` has no real typing and should.
Possibly split this up into a shared, and custom per type (image, text).

Expected:

- All component, functions, objects, variables... must use strict typing that is globally defined in types/index.d.ts
- if you encounter more issues like this, either create a separate bug or resolve.
