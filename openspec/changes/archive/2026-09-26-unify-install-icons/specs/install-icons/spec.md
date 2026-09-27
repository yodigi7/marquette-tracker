# Spec Delta

## Purpose

Defines the application's install and browser-tab icon artwork: what every icon surface must look like, that all of them come from a single committed source, and that they are verified rather than assumed.

## ADDED Requirements

### Requirement: Install icons are full-bleed and fully opaque

Every install icon SHALL be a single canvas whose entire area is filled with one uniform near-black background, so that every pixel is fully opaque and no pixel is transparent. No icon SHALL carry a rounded tile, an inner border, an outline, or a transparent margin baked into the image, because the operating system applies its own icon shape and any shape already present in the file is masked a second time.

#### Scenario: Corner pixels match the background

- **WHEN** the corner, edge, and centre pixels of any install icon are inspected
- **THEN** every one of them is fully opaque and the corners use the same near-black colour as the surrounding canvas

#### Scenario: No inner edge exists before masking

- **WHEN** an install icon is viewed on its own, before any platform mask is applied
- **THEN** no inner rounded-square edge, ring, or border is visible anywhere in the image

#### Scenario: No inner edge appears after masking

- **WHEN** a platform applies its own icon mask to an install icon
- **THEN** the visible result is a single evenly filled shape with no white crescent, ring, or uneven edge at the corners

#### Scenario: The maskable icon is full-bleed

- **WHEN** the icon declared for maskable use is inspected
- **THEN** its background reaches all four edges of the canvas with no border and no transparent margin

### Requirement: All icon surfaces share one centred mark

Every icon the project ships — the install icons, the Apple touch icon, the favicon, and the scalable icon — SHALL render the same three-bar mark at the same proportions, positioned so the mark is centred on its canvas. The mark SHALL occupy the same fraction of the canvas in each icon, so it does not appear to change size between surfaces.

#### Scenario: The mark is identical across icons

- **WHEN** the mark's bounding box is measured in each shipped icon and expressed as a fraction of that icon's canvas
- **THEN** the horizontal span, vertical span, and bar widths agree across all of them

#### Scenario: The mark is centred

- **WHEN** the centre of the mark's bounding box is compared with the centre of the canvas
- **THEN** they coincide, so no icon shows the mark sitting above or below centre

#### Scenario: The mark is not reshaped per icon

- **WHEN** the icons are compared for the bar colours, their ascending heights, and their common baseline
- **THEN** all of them present the same mark rather than a variant of it

### Requirement: The mark survives aggressive platform masking

The mark's meaningful content SHALL remain inside the safe area that platform launchers preserve, so that no launcher mask crops the mark. For maskable use this safe area is the circle covering the inner 80% of the canvas.

#### Scenario: The mark fits the maskable safe area

- **WHEN** the distance from the canvas centre to the farthest mark pixel is measured
- **THEN** it is within the radius of the inner 80% circle, leaving margin rather than sitting on the boundary

#### Scenario: A circular mask does not crop the mark

- **WHEN** a launcher applies the most aggressive common mask, a circle inscribed in the safe area
- **THEN** all three bars remain fully visible and uncut

### Requirement: The browser tab shows the application's own mark

The icon a browser displays for the application — in a tab, a bookmark, or a history list — SHALL be the same three-bar mark used by the installed application, at the small sizes browsers request. The project's favicon SHALL provide those sizes rather than a single larger size alone.

#### Scenario: The tab shows the app mark

- **WHEN** the application is opened in a browser tab or bookmarked
- **THEN** the three-bar mark is displayed rather than unrelated placeholder artwork

#### Scenario: The mark is legible at tab size

- **WHEN** the icon is rendered at 16 and 32 pixels
- **THEN** all three bars can be distinguished from one another and none merges into its neighbour

#### Scenario: The mark stays legible against a light tab bar

- **WHEN** the icon is displayed next to browser chrome of a light colour
- **THEN** the lightest bar remains visible, because the icon carries its own dark background

#### Scenario: The favicon provides the requested sizes

- **WHEN** the favicon is inspected for the sizes it contains
- **THEN** it includes entries for 16, 32, and 48 pixels

### Requirement: The Apple touch icon is declared explicitly

The application document SHALL declare its Apple touch icon, so that the icon used for the iOS Home Screen is chosen deliberately rather than left to the browser's discretion among the assets it happens to find.

#### Scenario: The Home Screen icon is the declared one

- **WHEN** the application is added to an iOS Home Screen
- **THEN** the icon used is the one the document declares as its Apple touch icon

#### Scenario: A non-iOS browser ignores the declaration safely

- **WHEN** a browser that does not use Apple touch icons loads the document
- **THEN** the declaration has no effect on the icons that browser uses

### Requirement: Every icon is reproducible from one committed source

The project SHALL keep the geometry of the mark in a single committed source, and SHALL provide a command that regenerates every shipped icon from it. Regenerating SHALL be deterministic: repeated runs on an unchanged source SHALL produce byte-identical files, so that a diff of the icon assets reflects a deliberate artwork change and nothing else.

#### Scenario: Regenerating produces no diff

- **WHEN** the regeneration command is run on a source that has not changed
- **THEN** every regenerated file is byte-identical to the committed file and the working tree shows no change to the icon assets

#### Scenario: Changing the source changes the icons

- **WHEN** the mark's geometry is deliberately changed in the committed source and the command is re-run
- **THEN** the regenerated icons reflect the change across every size and format the project ships

#### Scenario: The generator needs no additional installation

- **WHEN** the regeneration command is run in a freshly installed checkout
- **THEN** it succeeds using only the project's existing dependencies

### Requirement: Icon assets are verified rather than assumed

The project's quality gates SHALL fail when a shipped icon stops matching its source, when a required install icon contains a non-opaque pixel, or when the mark leaves the maskable safe area. This verification SHALL run as part of the single canonical quality command, so no separate step is needed to catch the defect.

#### Scenario: A hand-edited icon is caught

- **WHEN** a shipped icon file is modified without changing the committed source
- **THEN** the canonical quality command fails and identifies the icon that no longer matches

#### Scenario: A non-opaque pixel is caught

- **WHEN** a required install icon contains a transparent or partially transparent pixel
- **THEN** the canonical quality command fails and identifies the offending icon

#### Scenario: A safe-area violation is caught

- **WHEN** the committed geometry would place mark content outside the maskable safe area
- **THEN** the canonical quality command fails and reports the measurement that exceeded the safe area

#### Scenario: Verification needs no separate command

- **WHEN** a maintainer runs the single canonical quality command
- **THEN** the icon checks run as part of it, with no additional command required

### Requirement: The manifest declares a valid, resolvable icon set

The web app manifest SHALL continue to declare a 192-pixel and a 512-pixel icon, a 512-pixel icon for maskable use, and a 180-pixel Apple touch icon, each with a correct declared size, image type, and purpose, and each pointing at a file the project actually ships. Every icon the document and the manifest reference SHALL resolve under the project's deployment base path in the production build.

#### Scenario: The manifest declares the required sizes and purposes

- **WHEN** the built manifest is inspected
- **THEN** it declares a 192-pixel icon, a 512-pixel icon, a 512-pixel icon marked for maskable use, and a 180-pixel Apple touch icon, and every referenced file exists in the build output

#### Scenario: Declared sizes match the actual files

- **WHEN** each declared icon's declared size and purpose are compared with the file it references
- **THEN** they match, so no icon is advertised at a size or purpose it does not have

#### Scenario: Icons resolve under the deployment base path

- **WHEN** the built application is inspected for the icon links in its document and manifest
- **THEN** every reference resolves within the project's deployment subpath rather than to the host root
