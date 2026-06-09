# Outside Office Hours Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the second line of the `/bookings/add` outside-office-hours notice with the approved Thai wording.

**Architecture:** Keep the existing office-hours calculation and conditional rendering unchanged. Modify only the JSX text node inside the existing amber alert, then verify the exact visible copy through the browser and run lint.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, `playwright-cli`, ESLint

---

## File Structure

- Modify: `app/bookings/add/page.tsx` - owns the booking-add form and its outside-office-hours alert.

### Task 1: Update Outside Office Hours Notice Copy

**Files:**
- Modify: `app/bookings/add/page.tsx:317`

- [ ] **Step 1: Start the development server if it is not already running**

Run:

```powershell
npm run dev
```

Expected: Next.js reports a local URL such as `http://localhost:3000`.

- [ ] **Step 2: Open the browser display and verify the approved copy is initially absent**

Run:

```powershell
playwright-cli open http://localhost:3000/bookings/add
playwright-cli show
playwright-cli eval "document.body.innerText.includes('วันหยุดและวันธรรมดาช่วงเวลา 16.31 ถึง 08.29 น. กรุณาติดต่องานยานพาหนะ')"
```

Expected before implementation: `false`.

- [ ] **Step 3: Replace the existing second-line JSX text**

In `app/bookings/add/page.tsx`, replace the current second-line notice with:

```tsx
วันหยุดและวันธรรมดาช่วงเวลา 16.31 ถึง 08.29 น. กรุณาติดต่องานยานพาหนะ
```

- [ ] **Step 4: Verify the browser displays the exact approved text**

Run:

```powershell
playwright-cli reload
playwright-cli eval "document.body.innerText.includes('วันหยุดและวันธรรมดาช่วงเวลา 16.31 ถึง 08.29 น. กรุณาติดต่องานยานพาหนะ')"
```

Expected after implementation: `true`.

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: ESLint exits with code `0`.

- [ ] **Step 6: Review the scoped diff**

Run:

```powershell
git diff -- app/bookings/add/page.tsx
```

Expected: only the second-line outside-office-hours notice text changes.

- [ ] **Step 7: Commit the implementation**

Run:

```powershell
git add -- app/bookings/add/page.tsx
git commit -m "fix: clarify outside office hours notice"
```
