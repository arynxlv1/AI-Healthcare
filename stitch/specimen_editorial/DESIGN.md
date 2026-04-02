# Design System Strategy: Biopunk Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Clinical Manuscript"**

This design system rejects the "app-like" fluidity of modern SaaS in favor of the rigid, authoritative weight of a high-end scientific journal. It is a digital manifestation of precision biology—where the raw, "acidic" energy of life meets the disciplined structure of Bauhaus design.

The aesthetic avoids standard interface tropes (rounded corners, soft glows) to embrace **Organic Brutalism**. We treat the screen as a physical specimen: a tactile, printed parchment that has been analyzed and annotated. The interface should feel like an interactive edition of *Nature* or *Cell*—dense with information, yet impeccably organized through sharp geometry and intentional asymmetry. We do not design "screens"; we curate "plates."

---

## 2. Colors & Surface Architecture

The palette is rooted in biological realism. We utilize high-contrast "ink" on "parchment" to ensure the highest legibility, accented by hyper-saturated metabolic greens.

### Surface Hierarchy & Nesting
Traditional borders are secondary to tonal shifts. We define depth through "Stacking Sheets."
- **Primary Base:** `--parchment` (#F5F0E8) - The global background.
- **Secondary Tier:** `--cream` (#EDE7D9) - Used for primary content containers and cards.
- **Tertiary Tier:** `--linen` (#D9D0BE) - Used for nested data modules or "specimen" containers.
- **Sidebar:** `--charcoal` (#2A2A26) - A grounding, dark void that provides a high-contrast anchor for navigation.

### The "No-Soft-Border" Rule
While the original specs mention `--linen` for dividers, designers are prohibited from using 1px solid borders for general sectioning. Boundaries must be defined by:
1.  **Background Shifts:** Transitioning from `--parchment` to `--cream`.
2.  **Double-Rule Dividers:** Two 1px lines (`--linen`) with a 2px gap. This is our signature editorial mark.
3.  **Hard Offsets:** The 3px hard shadow (`--linen`) provides the only "lift" permitted.

### Signature Textures
Every surface must include a **3% opacity grain texture**. This breaks the digital smoothness, simulating the tooth of high-grade archival paper. Use `--acid` (#7AE23A) only for "Metabolic Accents"—data peaks, primary CTAs, or active biological markers. It should never exceed 10% of the screen real estate.

---

## 3. Typography: The Bauhaus Editorial

The typographic system is a dialogue between the classicism of the serif and the mechanical precision of the mono.

*   **Headings (Playfair Display):** Use for "Title" and "Display" levels. These should feel like journal article titles—authoritative and elegant. Use `headline-lg` for section starts to establish an editorial rhythm.
*   **Body (DM Sans):** The workhorse. This provides the "Bauhaus" efficiency. High x-height and geometric clarity make complex medical text digestible.
*   **Data & Metrics (IBM Plex Mono):** All numerical data, lab results, and metadata must use the mono-scale. This signals "raw intelligence" and machine-read accuracy.

**Typographic Hierarchy as Brand:**
- **Display-LG:** Playfair Display, 3.5rem. Used for hero data points or section introductions.
- **Label-SM:** IBM Plex Mono, 0.6875rem (All Caps). Used for "Metadata Tags" or "Specimen ID" labels.

---

## 4. Elevation & Depth: Tonal Layering

This system forbids standard Z-axis shadows. We create "Tactile Lift" using physical offsets.

*   **The Layering Principle:** To emphasize an element, do not use a blur. Instead, use a background shift to `--surface-container-high` and apply the **Hard Offset Shadow**: `3px 3px 0px #D9D0BE`.
*   **The "Ghost Border" Fallback:** If a container sits on an identical background, use the `--linen` token at 20% opacity. Avoid 100% opaque borders unless they are the "Double-Rule" divider.
*   **Tactile Interaction:** On hover, elements should not "glow." They should shift their offset—moving from a 3px shadow to a 1px shadow—to simulate the physical pressing of a stamp or a button into paper.

---

## 5. Components

### Buttons
- **Primary:** Background: `--ink`; Text: `--parchment`; Radius: `0px`.
- **Secondary:** Background: `transparent`; Border: `1px solid --ink`; Text: `--ink`.
- **Accent:** Background: `--acid`; Text: `--moss`. Reserved for "Execute" or "Analyze" actions.
- **State:** No rounded corners. Focus states are indicated by a 1px `--acid` offset outline.

### Input Fields
- **Styling:** Underline-only (1px `--linen`) or full box with `0px` radius.
- **Labels:** Always `label-md` (IBM Plex Mono) sitting above the field in `--fog`.
- **Error State:** Border shifts to 2px `--sienna`. Helper text appears in `label-sm` (Mono).

### Cards & Lists
- **The Specimen Card:** A `--cream` background with a `3px 3px 0px --linen` shadow. No internal dividers. Separate list items using `6 (1.5rem)` vertical spacing.
- **Dividers:** Use the "Double-Rule" (`1px / 2px gap / 1px`) in `--linen` only to separate major logical shifts (e.g., Patient Info vs. Genomic Data).

### Signature Component: The "Data Specimen"
A specialized container for medical metrics.
- Background: `--linen` at 10% opacity.
- Border-left: 4px solid `--acid` (for healthy) or `--sienna` (for critical).
- Content: Uses `IBM Plex Mono` for all values.

---

## 6. Do's and Don'ts

### Do:
- **Use White Space as Structure:** Trust the spacing scale (specifically `12` and `16`) to separate content rather than drawing lines.
- **Lean into Asymmetry:** Align headings to the left while pushing metadata labels to the far right of a container to create an editorial "spread" feel.
- **Keep it Sharp:** Every corner must be `0px`. Even a 1px radius breaks the "Scientific Journal" illusion.

### Don't:
- **No Gradients (Mostly):** Avoid decorative color gradients. The only exception is a subtle 5% vertical tint on the Sidebar to imply depth.
- **No Soft Shadows:** Never use `box-shadow` with a blur radius greater than `0px`.
- **No "App" Icons:** Use minimal, geometric, stroke-based icons. Avoid "filled" or "playful" icon sets. They should look like diagrams, not emojis.
- **No Dark Mode:** This system is built on the concept of "Printed Matter." Dark mode contradicts the parchment/ink metaphor and is strictly prohibited to maintain brand integrity.