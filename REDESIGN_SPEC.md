# Design Overhaul Prompt — LeetStreak

You are an expert product designer, UX designer, and senior frontend engineer specializing in modern Next.js applications.

Your objective is **not** to incrementally improve the current UI. Instead, perform a **complete product redesign** while preserving all existing business logic and core functionality.

The result should feel like a premium SaaS product that sits somewhere between **Linear, Vercel, Arc Browser, Stripe Dashboard, Mercury, Raycast, and modern fintech dashboards**, while remaining playful enough for a LeetCode streak-tracking application.

---

# Primary Goals

1. Completely redesign the visual language.
2. Reimagine every page and user flow.
3. Keep all existing backend logic and core features.
4. Add thoughtful UX improvements where appropriate.
5. Build almost everything using reusable component libraries before writing custom UI.
6. Prioritize polished interactions and animations.
7. Make the application feel fast, premium, and highly interactive.

---

# Component Library Priority (Very Important)

Always search for existing components before creating custom ones.

Use libraries in this exact priority order:

1. **21st.dev MCP**
2. **MagicUI MCP**
3. **shadcn MCP**

When implementing any section:

* search 21st.dev first
* if nothing appropriate exists, search MagicUI
* if still unavailable, use shadcn
* only build custom components as a last resort

I intentionally have MCP servers installed for these libraries.

Leverage them heavily.

---

# Tech Stack

Current stack:

* Next.js 16 App Router
* React 19
* Tailwind CSS v4
* motion
* shadcn
* MagicUI
* Base UI
* next-themes
* Sonner
* Supabase
* Vercel

Do not change the architecture.

Do not replace the backend.

Do not rewrite business logic unless absolutely necessary.

---

# Core Functionality To Preserve

Preserve every existing feature:

* authentication
* onboarding
* LeetCode username linking
* daily streak tracking
* nightly sync
* nightly settlement
* groups
* invites
* group policies
* grace periods
* streak freezes
* leaderboards
* stats
* sync jobs
* confetti
* heatmaps
* charts
* avatar
* settings
* cron endpoints

Do not remove functionality.

---

# You May Add Features

Feel free to introduce product improvements such as:

## Dashboard

* achievement cards
* streak milestones
* XP/progression
* activity timeline
* recent solves feed
* contribution graph
* current ranking
* weekly goals
* completion percentage
* productivity score
* animated counters
* badges
* challenge cards
* personal insights
* "today's objective"

---

## Groups

Improve into something resembling a collaborative workspace.

Ideas:

* live activity feed
* member status indicators
* who solved today
* today's missing members
* countdown until settlement
* leaderboard movement
* streak momentum
* animated podium
* challenge widgets
* group insights
* member cards
* recent accomplishments

---

## Stats

Transform from simple charts into an analytics dashboard.

Examples:

* KPI cards
* radial charts
* comparison cards
* historical trends
* streak growth
* consistency score
* solve velocity
* weekly averages
* monthly summaries
* heatmaps
* interactive charts
* hover animations

---

# Overall Product Feel

Target:

* premium SaaS
* polished fintech dashboard
* interactive
* elegant
* playful without looking childish
* glassmorphism only when appropriate
* layered depth
* smooth transitions
* subtle gradients
* clean typography
* generous whitespace
* delightful microinteractions

Avoid:

* generic Tailwind admin templates
* blocky layouts
* overly colorful gaming aesthetics
* excessive shadows
* clutter
* flat pages

---

# Visual Language

Completely rethink:

* colors
* spacing
* typography
* component hierarchy
* borders
* shadows
* cards
* icons
* animations
* layout system
* page structure

Nothing should feel inherited from the previous design.

---

# Typography

Replace the existing font choices.

Select a modern pairing.

Possible direction:

* Geist
* Inter
* Manrope
* Plus Jakarta Sans
* Instrument Sans
* Satoshi (if available)
* General Sans (if available)

Use typography intentionally:

* large hero headings
* expressive metrics
* subtle labels
* excellent hierarchy

---

# Color Palette

Dark mode should remain the primary experience.

Use a richer design system than grayscale.

Examples:

background

* near-black
* graphite
* charcoal

accents

* emerald
* blue
* violet
* amber

Success states should feel rewarding.

Avoid harsh saturation.

---

# Animations

Animation quality is extremely important.

Use motion intentionally.

Examples:

* page transitions
* layout animations
* staggered reveals
* hover elevation
* card expansion
* animated counters
* progress fills
* chart transitions
* leaderboard movement
* floating indicators
* tab transitions
* dialog transitions
* optimistic UI
* loading skeletons
* blurred entrances

Everything should feel alive without becoming distracting.

---

# Landing Page

Redesign from scratch.

Goals:

* premium first impression
* beautiful hero
* product visualization
* interactive demo
* dashboard preview
* social proof
* feature sections
* screenshots
* testimonials (placeholder)
* FAQ
* polished login area

Possible sections:

Hero

Animated dashboard preview

Feature grid

Statistics

How it works

Group collaboration

Streak visualization

CTA

Footer

---

# Dashboard

Do not simply stack cards vertically.

Create a real dashboard layout.

Ideas:

Top area:

* welcome
* streak summary
* today's objective
* quick stats

Middle:

* activity
* heatmap
* progress
* charts

Side panel:

* insights
* reminders
* achievements
* sync status

Bottom:

* recent activity
* milestones
* trends

---

# Groups

Rebuild completely.

Treat each group like a collaborative workspace.

The leaderboard should feel dynamic.

Members should have richer profile cards.

Policies should be presented elegantly.

Invites should feel polished.

---

# Stats

Look like a modern analytics dashboard.

Mix:

* charts
* KPIs
* trends
* comparisons
* insights

Not just charts stacked vertically.

---

# Navigation

Reconsider navigation entirely.

Current tabs should not dictate the new UX.

Explore ideas like:

* floating navigation
* collapsible sidebar
* dock navigation
* command palette
* quick actions
* contextual actions

Navigation should feel modern.

---

# Components

Use high-quality interactive components whenever possible.

Examples:

* animated cards
* number tickers
* spotlight cards
* glowing borders
* charts
* radial progress
* timelines
* Bento grids
* dock navigation
* animated tabs
* command menus
* accordions
* expandable sections
* hover cards
* data tables
* skeleton loaders
* gradient buttons
* floating actions

---

# UX Improvements

Look for opportunities to improve workflows.

Examples:

Reduce clicks.

Improve onboarding.

Improve discoverability.

Improve empty states.

Improve loading states.

Improve mobile experience.

Improve accessibility.

Improve responsiveness.

---

# Performance

Despite the richer UI:

* preserve excellent performance
* lazy-load heavy sections
* optimize animations
* avoid unnecessary rerenders
* maintain responsive interactions

---

# Accessibility

Maintain:

* keyboard navigation
* focus states
* screen reader compatibility
* sufficient contrast
* reduced motion support

---

# Development Process

Work page-by-page.

For each page:

1. Analyze current UX.
2. Identify shortcomings.
3. Search 21st.dev MCP.
4. Search MagicUI MCP.
5. Search shadcn MCP.
6. Compose the page using reusable components.
7. Add custom pieces only if necessary.
8. Polish spacing.
9. Polish animations.
10. Ensure responsiveness.

Do not rush into coding.

Think like both a designer and frontend architect.

---

# Deliverable Expectations

Every screen should feel intentionally designed rather than assembled from standard components.

The finished application should look like a product that could be featured on:

* Awwwards
* Godly
* Landbook
* SaaSFrame
* Mobbin
* Vercel Showcase

while remaining highly usable for daily productivity.

Whenever you need a UI component, always begin by searching:

1. 21st.dev MCP
2. MagicUI MCP
3. shadcn MCP

before implementing anything custom.

Your guiding principle is:

**Preserve the engine, reinvent the entire experience.**

