# Booking Tab Control Design

## Goal

Improve the `/bookings` tab control so it feels modern and standard on desktop and mobile without changing booking data, filters, or status behavior.

## Approved Direction

Use the Desktop Tabs, Mobile Select pattern.

Desktop and tablet widths keep a visible status tab row with icons, labels, counts, active state, and keyboard-friendly tab semantics. Mobile widths replace the horizontal tab row with one full-width status selector that shows each status label with its current count.

## Scope

- Modify `components/BookingListClient.tsx`.
- Preserve the existing `BookingTab` values, counts, URL query behavior, and filter reset behavior.
- Keep department and date filters desktop-only as they are today.
- Do not add new routes, data fetching, or persistent state.

## Responsive Behavior

- Mobile: show a status `<select>` above the booking cards. Changing it calls the same `updateFilters()` flow used by the desktop tabs.
- Desktop: show the tab list only from `md` and up, with cleaner spacing and active/inactive styling.
- Both controls use the existing Thai labels and count data from `bookingTabs` and `tabCounts`.

## Verification

- Add a failing static check before production edits to prove the mobile status select is absent.
- Implement the responsive controls.
- Run the static check again, then `npm run lint`.
- Use `playwright-cli show` before browser verification, then inspect `/bookings` at desktop and mobile widths.
