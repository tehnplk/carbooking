# Completed Trip Report Design

## Goal

Add a `/report` page that benchmarks vehicle and driver usage by completed-trip count.

## User Interface

- Add a permanent left sidebar item named `รายงาน` linking to `/report`.
- Add two tabs on `/report`: `ยานพาหนะ` and `พนักงานขับรถ`.
- Display a responsive horizontal Chart.js bar chart in each tab.
- Sort bars from highest to lowest completed-trip count.
- Show an empty-state message when no completed-trip usage exists.

## Data Rules

- Include only bookings with the completed status used for `เดินทางแล้ว`.
- Count each assigned vehicle once per completed trip.
- Count each assigned driver once per completed trip.
- Use `trip_car_driver` assignments so merged bookings do not inflate counts.

## Implementation

- Add `chart.js` and `react-chartjs-2`.
- Query report data on the server in `/report`.
- Render charts in a client component that registers the required Chart.js scales, elements, and plugins.
- Add `/report` to the layout page-title map.

## Verification

- Run the report aggregation tests.
- Run lint for the changed files.
- Build the application.
- Open `/report` with `playwright-cli show` and verify the sidebar item, both tabs, and chart canvas.
