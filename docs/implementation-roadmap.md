# Vaultbase Implementation Roadmap

This roadmap describes the recommended implementation order for the current Next.js and Supabase project.

## Current implementation status

The first vertical slice is now implemented in the repository:

- Foundation migration with profiles, collections, items, links, tags, item-tag relationships, indexes, triggers, and RLS.
- Authenticated `/dashboard` route.
- Create and list user-owned items.
- Search by item title and description.
- Optional collection, URL, and comma-separated tags during item creation.
- Item detail route at `/dashboard/[id]`.
- `/protected` now redirects to the dashboard instead of showing starter tutorial content.
- Starter landing-page, deployment, logo, and tutorial components removed; the public and authenticated shells now use Vaultbase branding.
- Authentication UX improved with password visibility controls, subtle animations, and a Gmail confirmation screen after sign-up.
- Added a follow-up authenticated table-grants migration and a Suspense boundary for uncached dashboard data under Next.js Cache Components.
- Added a responsive authenticated sidebar with active navigation state and mobile drawer behavior. Item creation is available from one Dashboard-header modal.
- Collection detail pages now provide an Add item modal with the current collection preselected.
- Dashboard item creation now labels the collection selector explicitly as Add to collection.
- Recent items now support assigning, moving, or removing an existing item from a collection.
- The main Dashboard list now shows only unassigned items; assigned items are shown inside their Collection.
- Collections now support server-side search by name and description.
- Optional encrypted credentials are now supported with a vault passphrase, masked password display, reveal, and copy actions. Apply supabase/migrations/003_item_credentials.sql before using this feature.
- Custom item type labels are supported when creating items. Apply `006_custom_item_types.sql` before using this field.
- Private image, video, and document attachments are supported from both Create new item and Edit item. Existing files can be deleted from the item detail page. Apply `007_item_attachments.sql` and `008_data_integrity_hardening.sql` before using uploads.
- Collections are now functional with create, list, item-count, and collection-detail views. Settings remains planned.
- Collections now support a type dropdown (`General`, `Work`, `Personal`, `Finance`, `Projects`, or `Bookmarks`) stored by migration `004_collection_types.sql` and displayed in collection views.
- Collection creation now includes an `Other` option with a custom type input, stored with the validation from `005_custom_collection_types.sql`.
- Collections list now includes a live type dropdown filter for predefined and custom collection types.
- Collection detail now includes an Edit collection modal for updating the name, type, and description.
- Collections list and detail routes now defer authenticated data behind Suspense loading boundaries, matching the Dashboard route.
- Corrected sidebar active-state matching so Dashboard and Collections do not remain highlighted at the same time.
- Wrapped the sidebar pathname-dependent client UI in Suspense to support dynamic collection detail routes.
- Settings is now functional for display name, read-only email, and password reset. Theme selection is available in the authenticated header. Account deletion and export remain planned.
- Settings now shares the protected sidebar layout and centers its content consistently across screen sizes.
- Item detail pages now defer authenticated reads behind Suspense, matching the dashboard and collection routes.
- Item detail pages now include an edit modal for title, type, collection, description, multiple URLs, tags, and new attachments. Credential editing is a separate unlock-and-re-encrypt security flow for username/email and password.

The migrations must be applied to the Supabase project before the dashboard can read or write data, in filename order. The follow-up grants migration is required when the initial schema was created through the SQL Editor.

The local app also requires a `.env.local` file based on `.env.example`. This file is intentionally not committed because it contains project configuration.

## Phase 0: Decisions and preparation

- Confirm whether the product is primarily a personal organizer, a CRM, or a team workspace.
- Confirm whether stored credentials are required. If yes, plan encryption separately from ordinary item fields.
- Create a Supabase project and configure local environment variables.
- Decide the initial file limits and allowed file types.
- Replace starter-template branding and tutorial content.

## Phase 1: Database foundation

Status: implemented as `supabase/migrations/001_vaultbase_foundation.sql`. Apply it to Supabase and test the policies with at least two accounts before production use.

Create migrations for:

- `profiles`
- `collections`
- `items`
- `item_links`
- `tags`
- `item_tags`
- `attachments`

For each table:

- Add `created_at` and `updated_at` where appropriate.
- Add foreign keys and useful indexes.
- Enable RLS.
- Add policies that restrict rows to the authenticated user's `owner_id`.
- Add an update trigger if automatic `updated_at` values are desired.

Do not rely on the client to enforce ownership.

## Phase 2: Application shell

Status: initial dashboard shell implemented at `/dashboard`.

Add authenticated routes for:

- `/dashboard`
- `/items/new`
- `/items/[id]`
- `/items/[id]/edit`
- `/collections`
- `/settings`

Build a shared authenticated navigation bar and replace the current protected tutorial page with the dashboard shell.

## Phase 3: Item management

Status: initial create, list, detail, and ownership-safe read flow implemented. Edit, archive, restore, and permanent delete remain.

Implement server-side actions or route handlers for:

- Creating an item
- Reading one item
- Listing the current user's items
- Updating an item
- Archiving an item
- Restoring an archived item
- Permanently deleting an item after confirmation

Validate form input on the server. Keep the UI optimistic only where rollback behavior is well-defined.

## Phase 4: Links, tags, and search

Status: initial URL, tags, and title/description search implemented. The current query searches only title and description; link/tag search, pagination, and richer search remain.

- Add links to item details.
- Add tag creation and assignment.
- Add collection assignment.
- Implement ownership-safe search.
- Add pagination or infinite loading before the data set becomes large.
- Add empty, loading, and error states.

## Phase 5: File uploads

Status: private attachment upload, preview, add-on-edit, and owner-checked deletion implemented. Resumable uploads, file-signature validation, cleanup transactions, and advanced media processing remain.

- Create a private Storage bucket.
- Add Storage RLS policies.
- Create attachment metadata before or during upload with a cleanup strategy.
- Validate file size, extension, MIME type, and file signature.
- Add previews for safe image types.
- Use signed URLs for downloads and previews.
- Add retry and cancellation states.

## Phase 6: Quality and production hardening

- Add unit tests for validation and data-access helpers.
- Add end-to-end tests for authentication, item ownership, search, and uploads.
- Run accessibility checks on forms and dialogs.
- Add error monitoring without recording sensitive content.
- Test RLS with multiple users.
- Test deletion and orphaned-file cleanup.
- Add export and account deletion flows.
- Review Supabase Storage and database costs.

## Recommended first implementation slice

The smallest useful vertical slice is:

1. Authenticated dashboard.
2. `items` table with RLS.
3. Create and list items.
4. Item detail and edit pages.
5. Search by title and description.
6. Tags and links.

After this works end-to-end, add attachments. This keeps the first database and security review manageable and provides a useful product before media handling introduces larger storage and validation concerns.

