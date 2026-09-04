# Privacy

This is a static, browser-only application. There are no application accounts and no server-side access control.

## Local data

The profile, health screening, menu, weight history, waist measurements, and check-ins can be stored in the browser's `localStorage`. That storage is not encrypted and is scoped to the website origin. Do not use it for confidential client records on a shared or unmanaged device.

The app exposes controls to save the current open program to the browser or delete its local copy. Browser storage errors are shown to the user. A JSON export should be kept as the recoverable backup.

Opening a shared link is session-only until the user explicitly chooses to save it on that device; it does not overwrite an existing local profile.

## Shared links

A link is a bearer link, not a password or authorization mechanism. Anyone who receives it can read its payload, and it may remain in clipboard history, browser history, messaging backups, or synced devices.

The simplified-view payload omits:

- the client-name field and waist;
- all medical screening flags;
- weight and check-in history;
- the completion checklist.

It still contains the specialist note, menu, and the basic numeric inputs required to reproduce nutrition targets. Review the note for identifying details and use a trusted delivery channel. The full colleague link contains the profile, medical screening, settings, and menu and should be shared only with an intended trusted recipient.

A professional multi-client service requires a dedicated origin, authenticated server storage, tenant separation, retention rules, and audit logging. This static app does not provide those guarantees.
