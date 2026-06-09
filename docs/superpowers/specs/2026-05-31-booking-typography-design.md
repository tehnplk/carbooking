# Booking Typography Design

## Goal

Improve the readability and visual hierarchy of the `/bookings` status controls and the `/bookings/add` form without changing layout, behavior, data flow, or the existing PLKCar visual language.

## Approved Direction

Use the Balanced Clarity treatment.

The interface should feel clean and restrained: Thai labels remain easy to scan, input values stop feeling unnecessarily heavy, and section headings remain clear without competing with the form content.

## Scope

- Modify `components/BookingListClient.tsx`.
- Modify `app/bookings/add/page.tsx`.
- Modify only the visible form-trigger classes in `components/DateTimePickerModal.tsx`.
- Preserve the existing Geist app font, colors, spacing, responsive layout, tab behavior, form behavior, and modal behavior.
- Do not change the date-time modal's internal typography.
- Do not add a new font dependency.

## Status Controls

### Desktop tabs

- Remove uppercase styling from the Thai tab labels.
- Keep labels compact at `text-[11px]`.
- Keep `font-semibold` so status labels remain clear in the dense desktop control.
- Preserve icons, count badges, active indicators, colors, tab semantics, and click behavior.

### Mobile status selector

- Keep the selector value at `text-sm font-semibold`.
- Remove uppercase styling from the visible Thai label above the selector.
- Keep the label compact at `text-[11px] font-medium`.
- Preserve the existing responsive behavior and URL filter updates.

## Booking Form

### Section headings

- Change section headings from `font-bold` to `font-semibold`.
- Keep headings at `text-base`.
- Preserve section icons and spacing.

### Field labels

- Standardize booking-form labels at `text-[11px] font-medium text-slate-500`.
- Remove uppercase styling from Thai labels.
- Preserve existing label icons.
- Apply the same label treatment to the visible date-time picker triggers.

### Field values

- Change standard input, select, and textarea values from `font-semibold` to `font-medium`.
- Keep values at `text-sm`.
- Preserve existing blue value color, backgrounds, focus states, dimensions, and textarea line height.
- Apply the same value treatment to the visible date-time picker trigger inputs.

### Choice and action controls

- Keep trip-type buttons and submit actions at `font-semibold` because they are choices and actions rather than passive form values.
- Preserve existing button dimensions, colors, error states, and interaction behavior.

## Verification

- Add a failing static check before production edits to prove the old uppercase and heavy form typography are still present.
- Update only the scoped typography classes.
- Run the static check again.
- Run `npm run lint`.
- Use `playwright-cli show` before browser verification, then inspect `/bookings` and `/bookings/add` at desktop and mobile widths.
- Confirm status controls, section headings, labels, standard field values, and date-time trigger values follow the approved hierarchy.
