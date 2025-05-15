# ShadowSight Dashboard – Frontend & UI Changes Documentation

## Theme & Global Styles
- Adopted a modern, glassy, and vibrant UI theme across all pages.
- Applied Poppins font globally for a clean, modern look.
- Used glassmorphism (translucent backgrounds, blur, soft borders) for cards and key UI elements.
- Ensured consistent spacing, rounded corners, and shadow effects throughout the app.

## Sidebar (LeftSidebar)
- Redesigned sidebar with glassy, translucent background and modern icons.
- Sidebar is collapsible with a chevron toggle, always vertically centered.
- Logo area updated for clarity and aesthetics; border removed from icon.
- Navigation links use vibrant hover and active states.
- Alerts badge now shows a live count of high-risk activities (with a plus sign, e.g., +5), updating instantly after CSV upload.
- Added new sections: Analysis Engine, Custom Alerts, Trusted Activities.
- Sidebar links and badge are fully responsive to app state.

## Page Layout & Structure
- Switched to a flex layout at the app shell level for robust sidebar/content separation.
- Removed default page title/header from layout; each page now controls its own header and spacing.
- All pages use a consistent background (`bg-gray-100`) and glassy card style.

## Alerts Dashboard
- Added tab navigation (Immediate Review, Custom Alerts, All Other Alerts, Closed) for filtering alerts.
- Refresh Alerts button added, styled with icon and modern look.
- Immediate Review tab shows only recent high-risk activities (top 5, riskScore >= 70).
- All Other Alerts tab shows all activities.
- Alerts badge in sidebar updates live based on the Immediate Review list.
- Full restyle for glassy cards, tabs, and typography.

## ActivityList Component
- Table rows are glassy, semi-transparent, with blur, rounded corners, and modern hover effects.
- Policy breach tags are pill-shaped, glassy, vibrant, and include icons.
- Headers are bold and modern; font is Poppins throughout.

## Custom Alerts Page
- Fully redesigned with glassy card, vibrant info banner, and modern form controls.
- All form fields, toggles, and buttons match the app's theme.
- Save Alert button uses a vibrant gradient style.
- Page content fills the available space with proper internal padding.

## Trusted Activities Page
- Matches the Custom Alerts page in style and layout.
- Glassy card, info banner, and modern form controls.
- Action buttons styled for consistency.

## CSV Upload Page
- Modern, glassy card for upload and processing.
- After successful upload, activities context is refreshed for live badge updates.
- User is navigated to Alerts page after processing.

## State Management & Live Updates
- Introduced ActivityContext for global, live state management of activities.
- All pages/components now use this context for consistent, live updates (including sidebar badge).
- After CSV upload or data change, context is refreshed and UI updates everywhere instantly.

## Miscellaneous
- Improved error handling and user feedback for uploads and data processing.
- Ensured all new features and UI changes are responsive and accessible.

---

**For further details or to contribute, see the main README.md or contact the project maintainer.** 