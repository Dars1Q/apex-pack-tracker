# Design System Strategy: Tactical Minimalism

## 1. Overview & Creative North Star
**The Creative North Star: "The Vanguard Interface"**

This design system rejects the "gamer" aesthetic of neon-soaked grids in favor of a sophisticated, tactical HUD (Heads-Up Display) experience. Inspired by the precision of competitive sci-fi shooters like *Apex Legends*, the system prioritizes "Combat Readiness"—meaning information is processed instantly, and every interaction feels intentional and mechanical.

We move beyond standard mobile templates by embracing **High-Contrast Editorial Layouts** and **Asymmetrical Depth**. Instead of centering everything, we use the spacing scale to create "breathing pockets" that guide the eye to critical data points. The UI isn't just a container; it is a high-performance tool built for one-handed operation in high-stakes environments.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian and charcoal, using light and shadow as functional components rather than decoration.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** 
Structural boundaries must be defined solely through background color shifts. To separate a section, transition from `surface` (#131313) to `surface_container_low` (#1c1b1b). This creates a "molded" look, as if the UI is machined from a single block of carbon fiber.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface_container_lowest` (#0e0e0e) for the deep background.
*   **Primary Content Area:** `surface` (#131313).
*   **Interactive Cards:** `surface_container` (#201f1f).
*   **Floating/Active Elements:** `surface_bright` (#393939).

### The "Glass & Gradient" Rule
For a premium, custom feel, use **Glassmorphism** on top-level overlays (like navigation bars or modals). Use `surface_variant` (#353534) at 60% opacity with a `20px` backdrop blur. 
*   **Signature Textures:** Apply a subtle linear gradient to `primary` CTAs, transitioning from `primary` (#ffb3ad) at the top left to `primary_container` (#ff544e) at the bottom right. This provides a "forged metal" glint.

---

## 3. Typography
The system utilizes a dual-font approach to balance tactical "readout" aesthetics with elite editorial readability.

*   **Display & Headlines (Space Grotesk):** This is our "HUD" font. The wider apertures and geometric construction feel high-tech. Use `display-sm` to `headline-lg` for mission-critical stats or screen titles.
*   **Body & Labels (Inter):** The workhorse. Inter provides maximum legibility for dense information. Use `body-md` for general content and `label-sm` for secondary metadata.

**Editorial Tip:** Use `letter-spacing: 0.05em` on all `label` styles and transform them to uppercase to lean into the military-grade telemetry aesthetic.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural shadows.

*   **The Layering Principle:** Place a `surface_container_high` (#2a2a2a) element inside a `surface_container_low` (#1c1b1b) container to create a soft, natural lift.
*   **Ambient Shadows (The Outer Glow):** For "floating" tactical cards, use a shadow color derived from `surface_tint` (#ffb3ad) at 5% opacity, with a `24px` blur and `0px` offset. This creates a subtle "active power" glow rather than a muddy drop shadow.
*   **The "Ghost Border" Fallback:** If a divider is mandatory for accessibility, use `outline_variant` (#5b403d) at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#ffb3ad) with `on_primary` (#680008) text. Use `xl` (1.5rem) roundedness for a "pill" feel that is easy to hit with a thumb.
*   **Secondary (Tactical):** `surface_container_highest` background with a `ghost border` of `primary`.
*   **Tertiary:** No background; `primary` text with an icon.

### Cards & Lists
*   **Cards:** Use `surface_container` (#201f1f) with `lg` (1rem) roundedness. **Forbid dividers.** Separate list items using `spacing-4` (0.9rem) vertical gaps.
*   **One-Handed Navigation:** All interactive elements must be placed within the bottom 60% of the screen (the "Thumb Zone").

### Inputs
*   **Field:** Use `surface_container_lowest` for the input well.
*   **Active State:** Transition the "Ghost Border" from `outline_variant` to `secondary` (#ffd799). The subtle amber glow indicates the system is "Ready for Input."

### Tactical Chips
*   Used for status (e.g., "LIVE", "QUEUED"). Use `error_container` for high-alert items with `on_error_container` text. These should be small, using `label-sm` typography.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place secondary labels aligned to the right while headlines stay left to create a dynamic, technical layout.
*   **Respect the "Glow":** Keep interactive glows subtle. If the UI looks like a "neon sign," reduce the opacity of the glow.
*   **One-Handed Focus:** Ensure the most important action is always reachable by the thumb without repositioning the phone.

### Don't:
*   **Don't use pure black (#000000):** It kills the depth. Use `surface_container_lowest` (#0e0e0e) for the deepest tones.
*   **Don't use 1px dividers:** They clutter the interface. Let the background color shifts do the work.
*   **Don't crowd the edges:** Maintain a minimum margin of `spacing-6` (1.3rem) from the screen edge to ensure the "Tactical" feel isn't lost to clutter.