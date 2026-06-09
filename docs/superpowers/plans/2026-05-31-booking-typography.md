# Booking Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Balanced Clarity typography treatment to the `/bookings` status controls and `/bookings/add` form without changing layout or behavior.

**Architecture:** This is a class-only presentation update across three existing components. `BookingListClient.tsx` owns the responsive status controls, `app/bookings/add/page.tsx` owns the booking form hierarchy, and `DateTimePickerModal.tsx` owns the visible date-time trigger that must match the form while its modal internals remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, playwright-cli.

---

## File Structure

- Modify: `components/BookingListClient.tsx`
  - Remove uppercase styling from desktop status tabs and soften the mobile status label.
- Modify: `app/bookings/add/page.tsx`
  - Soften section headings, labels, and passive field values.
- Modify: `components/DateTimePickerModal.tsx`
  - Match the visible date-time trigger label to the booking form.
- Verify: inline Node static checks, `npm run lint`, and visible playwright-cli inspection.

### Task 1: Status Control Typography

**Files:**
- Modify: `components/BookingListClient.tsx:611`
- Modify: `components/BookingListClient.tsx:706`

- [ ] **Step 1: Run the failing static check**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/BookingListClient.tsx","utf8"); const ok=s.includes("rounded-md px-3 text-[11px] font-semibold transition-all") && /className="mb-1\.5 block text-\[11px\] font-medium text-slate-500"\s+htmlFor="booking-status-mobile"/.test(s); if(!ok){console.error("Booking status typography is not balanced");process.exit(1)}'
```

Expected: FAIL with `Booking status typography is not balanced`.

- [ ] **Step 2: Apply the minimal class updates**

Change the mobile status label:

```diff
- className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500"
+ className="mb-1.5 block text-[11px] font-medium text-slate-500"
  htmlFor="booking-status-mobile"
```

Change the desktop tab class:

```diff
- 'relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[11px] font-semibold uppercase transition-all',
+ 'relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[11px] font-semibold transition-all',
```

- [ ] **Step 3: Run the static check again**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/BookingListClient.tsx","utf8"); const ok=s.includes("rounded-md px-3 text-[11px] font-semibold transition-all") && /className="mb-1\.5 block text-\[11px\] font-medium text-slate-500"\s+htmlFor="booking-status-mobile"/.test(s); if(!ok){console.error("Booking status typography is not balanced");process.exit(1)}'
```

Expected: PASS with exit code `0`.

- [ ] **Step 4: Commit the status-control change**

```powershell
git add -- components/BookingListClient.tsx
git commit -m "style: refine booking status typography"
```

### Task 2: Booking Form Typography

**Files:**
- Modify: `app/bookings/add/page.tsx:56`
- Modify: `app/bookings/add/page.tsx:334`
- Modify: `app/bookings/add/page.tsx:410`
- Modify: `app/bookings/add/page.tsx:415`

- [ ] **Step 1: Run the failing static check**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("app/bookings/add/page.tsx","utf8"); const forbidden=["font-semibold uppercase text-slate-500","px-3 text-sm font-semibold !text-blue-700","text-sm font-semibold leading-7 !text-blue-700","text-base font-bold text-slate-700","text-xs font-semibold text-slate-500"]; if(forbidden.some((value)=>s.includes(value))){console.error("Booking form still uses heavy typography");process.exit(1)}'
```

Expected: FAIL with `Booking form still uses heavy typography`.

- [ ] **Step 2: Update shared form typography constants**

Apply:

```diff
- const labelClass = 'ml-0.5 flex items-center text-[11px] font-semibold uppercase text-slate-500';
- const fieldClass = 'h-10 w-full rounded-md border-0 bg-white/70 px-3 text-sm font-semibold !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';
- const textareaClass = 'min-h-24 w-full resize-none rounded-md border-0 bg-white/70 px-3 py-2 text-sm font-semibold leading-7 !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';
+ const labelClass = 'ml-0.5 flex items-center text-[11px] font-medium text-slate-500';
+ const fieldClass = 'h-10 w-full rounded-md border-0 bg-white/70 px-3 text-sm font-medium !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';
+ const textareaClass = 'min-h-24 w-full resize-none rounded-md border-0 bg-white/70 px-3 py-2 text-sm font-medium leading-7 !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';
```

- [ ] **Step 3: Soften both section headings**

Apply:

```diff
- <h2 className="text-base font-bold text-slate-700">ข้อมูลผู้ขอและหน่วยงาน</h2>
+ <h2 className="text-base font-semibold text-slate-700">ข้อมูลผู้ขอและหน่วยงาน</h2>

- <h2 className="text-base font-bold text-slate-700">รายละเอียดการเดินทาง</h2>
+ <h2 className="text-base font-semibold text-slate-700">รายละเอียดการเดินทาง</h2>
```

- [ ] **Step 4: Standardize the travel-detail labels**

Apply:

```diff
- <label className="ml-0.5 text-xs font-semibold text-slate-500">ประเภทการเดินทาง</label>
+ <label className="ml-0.5 text-[11px] font-medium text-slate-500">ประเภทการเดินทาง</label>

- <label className="ml-0.5 text-xs font-semibold text-slate-500">สถานที่ไป</label>
+ <label className="ml-0.5 text-[11px] font-medium text-slate-500">สถานที่ไป</label>

- <label className="ml-0.5 text-xs font-semibold text-slate-500">วัตถุประสงค์การเดินทาง</label>
+ <label className="ml-0.5 text-[11px] font-medium text-slate-500">วัตถุประสงค์การเดินทาง</label>

- <label className="ml-0.5 text-xs font-semibold text-slate-500">เบิกค่าเชื้อเพลิงจาก</label>
+ <label className="ml-0.5 text-[11px] font-medium text-slate-500">เบิกค่าเชื้อเพลิงจาก</label>

- <label className="ml-0.5 text-xs font-semibold text-slate-500">ระยะทางประมาณ (กม.)</label>
+ <label className="ml-0.5 text-[11px] font-medium text-slate-500">ระยะทางประมาณ (กม.)</label>

- <label className="ml-0.5 flex items-center text-xs font-semibold text-slate-500">
+ <label className="ml-0.5 flex items-center text-[11px] font-medium text-slate-500">
```

Keep trip-type buttons and action buttons unchanged at `font-semibold`.

- [ ] **Step 5: Run the static check again**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("app/bookings/add/page.tsx","utf8"); const forbidden=["font-semibold uppercase text-slate-500","px-3 text-sm font-semibold !text-blue-700","text-sm font-semibold leading-7 !text-blue-700","text-base font-bold text-slate-700","text-xs font-semibold text-slate-500"]; if(forbidden.some((value)=>s.includes(value))){console.error("Booking form still uses heavy typography");process.exit(1)}'
```

Expected: PASS with exit code `0`.

- [ ] **Step 6: Commit the booking-form change**

```powershell
git add -- app/bookings/add/page.tsx
git commit -m "style: improve booking form type hierarchy"
```

### Task 3: Date-Time Trigger Typography

**Files:**
- Modify: `components/DateTimePickerModal.tsx:177`

- [ ] **Step 1: Run the failing static check**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/DateTimePickerModal.tsx","utf8"); const ok=s.includes("ml-0.5 flex items-center text-[11px] font-medium text-slate-500") && s.includes("px-3 text-sm font-medium !text-blue-700"); if(!ok){console.error("Date-time trigger typography does not match the booking form");process.exit(1)}'
```

Expected: FAIL with `Date-time trigger typography does not match the booking form`.

- [ ] **Step 2: Match the visible trigger label to the form**

Apply:

```diff
- <label className="ml-0.5 flex items-center text-xs font-semibold text-slate-500">
+ <label className="ml-0.5 flex items-center text-[11px] font-medium text-slate-500">
```

Leave the trigger input unchanged because it already uses `text-sm font-medium`. Do not edit typography inside the modal.

- [ ] **Step 3: Run the static check again**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/DateTimePickerModal.tsx","utf8"); const ok=s.includes("ml-0.5 flex items-center text-[11px] font-medium text-slate-500") && s.includes("px-3 text-sm font-medium !text-blue-700"); if(!ok){console.error("Date-time trigger typography does not match the booking form");process.exit(1)}'
```

Expected: PASS with exit code `0`.

- [ ] **Step 4: Commit the date-time trigger change**

```powershell
git add -- components/DateTimePickerModal.tsx
git commit -m "style: align booking date-time trigger typography"
```

### Task 4: Verification

**Files:**
- Verify: `components/BookingListClient.tsx`
- Verify: `app/bookings/add/page.tsx`
- Verify: `components/DateTimePickerModal.tsx`

- [ ] **Step 1: Run all three static checks**

Run:

```powershell
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/BookingListClient.tsx","utf8"); const ok=s.includes("rounded-md px-3 text-[11px] font-semibold transition-all") && /className="mb-1\.5 block text-\[11px\] font-medium text-slate-500"\s+htmlFor="booking-status-mobile"/.test(s); if(!ok){console.error("Booking status typography is not balanced");process.exit(1)}'
node -e 'const fs=require("fs"); const s=fs.readFileSync("app/bookings/add/page.tsx","utf8"); const forbidden=["font-semibold uppercase text-slate-500","px-3 text-sm font-semibold !text-blue-700","text-sm font-semibold leading-7 !text-blue-700","text-base font-bold text-slate-700","text-xs font-semibold text-slate-500"]; if(forbidden.some((value)=>s.includes(value))){console.error("Booking form still uses heavy typography");process.exit(1)}'
node -e 'const fs=require("fs"); const s=fs.readFileSync("components/DateTimePickerModal.tsx","utf8"); const ok=s.includes("ml-0.5 flex items-center text-[11px] font-medium text-slate-500") && s.includes("px-3 text-sm font-medium !text-blue-700"); if(!ok){console.error("Date-time trigger typography does not match the booking form");process.exit(1)}'
```

Expected: all three commands PASS with exit code `0`.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS with exit code `0`.

- [ ] **Step 3: Start the app if needed**

Run in a separate terminal if `http://localhost:3000` is not already available:

```powershell
npm run dev
```

Expected: Next.js reports a local development URL.

- [ ] **Step 4: Begin visible Playwright verification**

Run:

```powershell
playwright-cli open http://localhost:3000/bookings
playwright-cli show
```

Expected: the Playwright window is visible to the user before inspection begins.

- [ ] **Step 5: Inspect the status controls**

Run:

```powershell
playwright-cli resize 1440 1000
playwright-cli snapshot
playwright-cli resize 390 844
playwright-cli snapshot
```

Expected:

- Desktop shows the status tabs with compact restrained labels, count badges, and unchanged active indicators.
- Mobile shows the status selector with a lighter compact label.
- Responsive control switching still works.

- [ ] **Step 6: Mock office hours and inspect the booking form**

The current date is Sunday, May 31, 2026, so the form is intentionally hidden unless the server clock is mocked during browser testing.

Run:

```powershell
playwright-cli route "**/api/server-time" --body='{"now":1780279200000}'
playwright-cli goto http://localhost:3000/bookings/add
playwright-cli resize 1440 1000
playwright-cli snapshot
playwright-cli resize 390 844
playwright-cli snapshot
```

Expected:

- `/bookings/add` renders as if the server time were Monday, June 1, 2026 at 09:00 Asia/Bangkok.
- Section headings use the softer weight.
- Thai labels are consistently compact and medium weight.
- Standard field values and date-time trigger values are medium weight.
- Trip-type buttons and submit actions retain their stronger action emphasis.

- [ ] **Step 7: Remove the browser mock and close Playwright**

Run:

```powershell
playwright-cli unroute "**/api/server-time"
playwright-cli close
```

- [ ] **Step 8: Confirm the working tree**

Run:

```powershell
git status --short
```

Expected: only pre-existing unrelated user files remain, such as `AGENTS.md` and local log files.
