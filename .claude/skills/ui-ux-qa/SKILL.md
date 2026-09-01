---
name: ui-ux-qa
description: Audits UI/UX design, visual hierarchy, responsiveness, accessibility (WCAG), and component consistency across web/app interfaces, then automatically fixes bugs.
---

# UI/UX Quality Assurance & Design System Audit Skill

## Purpose

This skill provides a systematic standard operating procedure for auditing frontend code, identifying UI/UX defects, catching design inconsistencies, and applying code fixes to ensure professional, highly usable interfaces.

---

## Workflow Execution Steps

### 1. Discovery & Scope Assessment

When asked to perform a UI/UX audit or QA check:

- Inspect the repository layout to identify the frontend stack (e.g., React, Next.js, Vue, Tailwind CSS, Material UI, Shadcn/ui).
- Locate global tokens, theme configurations, CSS files, and reusable component directories.
- Read target layout files, components, or screens specified by the user.

### 2. The 5-Point QA Audit Checklist

Run a systematic inspection on the target files against these key pillars:

#### A. Visual Hierarchy & Spacing (Layout Polish)

- [ ] **Grid & Alignment:** Inconsistent padding/margins, misplaced elements, or broken alignment.
- [ ] **Vertical Rhythm:** Misaligned spacing scales (mixing arbitrary values like `p-[13px]` instead of tokenized scales like `p-4`).
- [ ] **Overflow & Clipping:** Unintended horizontal scrolling, text clipping, or broken flex/grid wrapping.

#### B. Accessibility & WCAG Compliance

- [ ] **Contrast Ratios:** Text colors failing minimum contrast standards (4.5:1 for normal text, 3:1 for large text).
- [ ] **Semantic HTML:** Non-semantic tags used for interactive elements (e.g., `<div onClick=...>` instead of `<button>`).
- [ ] **Form Controls:** Inputs missing associated `<label>` tags, missing `aria-describedby` or visible validation error states.
- [ ] **Focus Management:** Missing explicit `:focus-visible` outlines or broken keyboard navigation sequence.

#### C. Micro-interactions & State Coverage

- [ ] **Interactive States:** Missing `:hover`, `:active`, `:focus`, or `:disabled` visual feedback.
- [ ] **Component States:** Missing explicit empty states, loading indicators/skeletons, or error boundaries.
- [ ] **Touch Targets:** Interactive elements smaller than 44x44px on mobile viewports.

#### D. Typography & Design Consistency

- [ ] **Font Hierarchy:** Inconsistent line-heights, overlapping text, or arbitrary font-size declarations.
- [ ] **Color Tokens:** Hardcoded hex values (e.g., `#3b82f6`) instead of CSS custom properties or design system tokens (e.g., `var(--primary)`).

#### E. Responsive Flexibility

- [ ] **Breakpoint Safety:** Layouts breaking at standard mobile (375px), tablet (768px), or desktop (1280px) viewports.
- [ ] **Fluid Scaling:** Rigid `width` declarations where `max-width` or responsive percentage grids should be used.

---

### 3. Issue Reporting Format

Before writing code fixes, generate a structured UI/UX Audit Summary:

```markdown
## 🎨 UI/UX Audit Report

### 🚨 Critical Bugs (Usability / Accessibility Blockers)

- **[File Name:Line]** Description of bug & impact.

### ⚠️ Visual & Consistency Flaws

- **[File Name:Line]** Inconsistent token/spacing/alignment issue.

### ✨ UX Enhancement Opportunities

- **[File Name:Line]** Micro-interaction or state feedback improvement.
```
