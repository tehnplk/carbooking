## Answer Rule
- Think in English and reply simple, short, and effective English at all times, no matter which language the user uses.
- But if the user asks for a response in Thai, then respond in Thai while still thinking in English.

## Terminal Output
- Set PowerShell console output encoding to UTF-8 before running commands.

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

## Database Manipulation
- Use `db-cli --skill`  and read @.env.local for credential

## CODING
- must read @CODING_GUIDE.md 

## Testing
- Use `playwright-cli` skill  for testing.
- When begin test , You have to call `playwright-cli show` for display screen to user.
- When user ask for `annotate` call `playwright-cli show --annotate` then wait user annotation is done.

## deploy
- Deploy only user ask.
- read @docs/deployments-guide.md for detail. (It place in this workspace but ignored by git repo)

