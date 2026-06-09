# Booking Tab Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped mobile booking tab strip with a compact status select while keeping polished desktop tabs.

**Architecture:** This is a single-component presentation change in `components/BookingListClient.tsx`. Existing tab metadata, counts, and URL update behavior remain the source of truth.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, lucide-react, playwright-cli.

---

### Task 1: Responsive Booking Tab Controls

**Files:**
- Modify: `components/BookingListClient.tsx`

- [ ] **Step 1: Run a failing static check**

Run:

```powershell
node -e "const fs=require('fs'); const s=fs.readFileSync('components/BookingListClient.tsx','utf8'); if(!s.includes('aria-label=\"เลือกสถานะรายการ\"')) { console.error('Missing mobile booking status select'); process.exit(1); }"
```

Expected: FAIL with `Missing mobile booking status select`.

- [ ] **Step 2: Implement mobile select and desktop-only tab list**

In `components/BookingListClient.tsx`, update the header control area so:

```tsx
<div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-white p-3 sm:p-4 md:flex-row md:items-center">
  <div className="md:hidden">
    <label className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500" htmlFor="booking-status-mobile">
      สถานะรายการ
    </label>
    <select
      id="booking-status-mobile"
      aria-label="เลือกสถานะรายการ"
      value={activeTab}
      onChange={(event) => {
        updateFilters(
          isAuthenticated ? '' : departmentFilter,
          '',
          event.target.value as BookingTab
        );
      }}
      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    >
      {bookingTabs.map((tab) => (
        <option key={tab.key} value={tab.key}>
          {tab.label} ({tabCounts[tab.key]})
        </option>
      ))}
    </select>
  </div>
  <div className="no-scrollbar hidden gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 shadow-inner md:flex">
    ...
  </div>
</div>
```

The desktop tab buttons should keep their current click handler and counts, add `role="tab"`, `aria-selected`, and use slightly larger spacing.

- [ ] **Step 3: Run the static check again**

Run:

```powershell
node -e "const fs=require('fs'); const s=fs.readFileSync('components/BookingListClient.tsx','utf8'); if(!s.includes('aria-label=\"เลือกสถานะรายการ\"')) { console.error('Missing mobile booking status select'); process.exit(1); }"
```

Expected: PASS with exit code 0.

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS with exit code 0.

- [ ] **Step 5: Browser verify**

Run `playwright-cli show`, open `/bookings`, then verify:

- At desktop width, tabs are visible and the mobile select is hidden.
- At mobile width, the status select is visible and the tab strip is hidden.
- Changing the mobile select updates the booking tab query and visible booking list.
