# IMOBI Mobile - Expo troubleshooting

## Error: `ERR_NGROK_3200` / `exp.direct is offline`

This means Expo Go is trying to open an old tunnel URL. It is not an app code
crash. The Expo dev server that created that `exp.direct` URL stopped, so the
phone cannot reach it anymore.

### Fast fix on Windows / Cursor Desktop

From the repo root:

```bash
pnpm --filter @imbobi/mobile dev:tunnel
```

Then scan the new QR code in Expo Go.

Important:

- Do not reuse the old `exp://...exp.direct` URL.
- Every tunnel restart can create a new URL.
- If Expo Go keeps opening the old URL, close Expo Go completely and scan the
  new QR code again.

### If phone and computer are on the same Wi-Fi

LAN is usually faster and more stable:

```bash
pnpm --filter @imbobi/mobile dev:lan
```

Use tunnel only when LAN cannot reach the dev machine.

### When to use each command

| Situation | Command |
| --- | --- |
| Remote phone / different networks | `pnpm --filter @imbobi/mobile dev:tunnel` |
| Same Wi-Fi network | `pnpm --filter @imbobi/mobile dev:lan` |
| Normal local desktop dev | `pnpm --filter @imbobi/mobile dev` |

### If the QR still fails

1. Stop the old Expo process.
2. Close Expo Go on the phone.
3. Start again with `dev:tunnel`.
4. Scan only the newly printed QR code.
5. Confirm the terminal keeps running while the app is open.

