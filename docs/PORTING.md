# Porting guide

eye-guide is currently packaged as a Chrome MV3 extension, but the code should keep the portable parts separated for future iOS/Android app shells.

## Layer boundaries

- `src/core/` contains pure TypeScript logic and shared types. Do not import or reference `chrome.*`, DOM extension APIs, platform SDKs, network APIs, remote code, or UI framework code from this layer.
- `src/storage/` defines the storage adapter interface and platform implementations. The Chrome extension uses `chromeStorage`, which is the only place that should call `chrome.storage.local` directly.
- UI entrypoints such as `src/popup.ts` and `src/content.ts` may use Chrome tab/scripting/i18n/runtime APIs while this project is an extension, but saving and loading app data should go through a `StorageAdapter`.
- `src/core/**/*.ts` is guarded by lint against `chrome` global usage. Keep any future platform SDK access in entrypoints or adapters.

## Storage adapter contract

`StorageAdapter` exposes two platform-neutral operations:

- `read(keys)`: load one storage key or a readonly list of storage keys and resolve a partial `StorageSnapshot`.
- `write(values)`: persist a partial snapshot of known storage values.

Adapters must keep the key names below unchanged. Platform-specific adapters may translate `read`/`write` to Chrome storage, iOS local storage, Android shared preferences, or another local persistence mechanism, but they should not change the serialized value shapes. Missing values should stay omitted/`undefined`; callers in the UI shell should apply defaults with `src/core` helpers instead of storing platform-specific fallback objects.

Adapter implementations should not expose platform handles, promises from native SDKs with non-standard behavior, or UI objects through `StorageValues`. Keep those details inside the adapter and return plain JSON-compatible values.

## Storage compatibility

Keep the existing storage keys and value shapes stable:

- `settings`: `{ color, thickness, opacity, mode, autoOn }`
- `autoOnSites`: `string[]`
- `trial_start_ts`: `number`
- `isPremium`: `boolean`

Mobile ports should implement the same `StorageAdapter` contract with local device storage and migrate data without changing these shapes.

## Mobile porting notes

- Reuse `src/core` functions for settings merging, trial access calculation, color conversion, and site matching.
- Replace Chrome-only adapters and entrypoints with platform shells that call the same core functions. For iOS/Android, inject a platform `StorageAdapter` into the app UI/controller layer rather than importing native persistence from `src/core`.
- Keep `src/core` one-way: it may define reusable logic and types, but it must not import `src/storage`, Chrome APIs, DOM globals, or mobile SDKs.
- Keep the app fully offline unless a future product decision explicitly changes the privacy model and permissions.
- Do not add extension permissions, remote code loading, external CDNs, or external fonts for the Chrome build while preparing portability changes.
