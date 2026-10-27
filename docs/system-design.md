# Vaultbase System Design

## 1. Product direction

Vaultbase should be a private, searchable information workspace. A user can create records, attach files, save URLs, add notes, and organize everything with tags and collections.

Implementation note: the first slice currently supports user-owned items, one initial URL, tags, collections, title/description search, and private image/video/document attachments. The current search implementation only queries item titles and descriptions; link/tag search is planned. Attachments use a private Supabase Storage bucket with user-scoped paths and RLS-protected metadata.

The public shell and authenticated navigation use consistent Vaultbase branding, including the `V` icon in the landing-page and dashboard headers; starter-template tutorial and deployment UI has been removed.

The authentication experience includes branded, centered login and registration cards, a soft responsive background treatment, password visibility toggles, animated transitions, loading/error states, success toasts for sign-in, sign-up, and logout, and a post-signup confirmation screen with a direct Gmail link. Email confirmation remains required before normal sign-in.

Async actions use visible pending states and disabled submit controls to prevent duplicate submissions. This includes authentication, password reset, profile and collection saves, item creation/editing, collection assignment, attachment deletion, credential updates, and logout.

Item detail pages use a clearly styled dashboard back link. Logout keeps a stable button width, shows a spinner while signing out, reports sign-out errors, and refreshes the session-aware route after completion.

The dashboard defers authenticated Supabase reads behind a Suspense boundary so Next.js can prerender a loading shell and stream user-specific data at request time. Database access requires both RLS policies and explicit authenticated table grants.

Dashboard item detail pages use the same deferred authenticated-data pattern, so user-specific records do not block Next.js prerendering.

Item detail pages use a responsive workspace layout with a prominent item header, type and collection badges, last-updated metadata, summary counts, credential protection section, link cards, tag chips, and attachment previews with clear empty states. The layout expands on larger screens while remaining readable on mobile.

The authenticated application shell uses a responsive sidebar. Desktop users see persistent navigation for Dashboard, Collections, and Settings; mobile users get a collapsible drawer. Item creation is handled by one compact modal button in the Dashboard header to keep the sidebar focused on navigation. The modal has an explicit Add to collection selector and a quick Create and select collection action for users who need to organize a new item immediately. The quick collection form supports name, optional description, type, and custom type. Collection detail pages also provide an Add item button with the current collection preselected; the quick-create collection action is hidden there to prevent accidentally creating a separate collection while already working inside one. Collections are now functional: users can create collections, assign items to them, view collection item counts, and browse collection contents.

Create Item uses one action flow with a visible pending state, inline validation/upload errors, and client navigation after a successful save. This keeps failed submissions inside the modal instead of exposing a runtime redirect or error overlay.

The authenticated shell uses a wider responsive content canvas up to 1600px on large screens, while individual detail views keep their own readable max-widths.

Authenticated Supabase session checks use a request-time connection in the shared auth helper and the header uses a Suspense boundary, so auth time-dependent values do not run during prerendering on Dashboard, Collections, Item Detail, and Settings routes.

Recent item cards also provide an Add to collection or Move collection action, allowing an existing item to be organized without opening the item detail page.

Sidebar active-state matching is section-aware: Dashboard remains active for item detail pages, while Collections is highlighted for both the collection list and collection detail pages.

Items assigned to a collection are removed from the main Dashboard list and remain visible in that Collection.

The sidebar active-route hook is rendered behind its own Suspense boundary so dynamic collection routes can prerender safely under Next.js Cache Components.

Settings is functional for the first release: users can update their display name, view their sign-in email, and start a secure password reset flow. The page uses a wider responsive content area with full-width form controls that shrink safely on mobile. The color theme is available directly in the authenticated header for faster access. Account deletion, export, and avatar storage remain planned security-sensitive features.

The Settings route uses the same protected responsive layout as the Dashboard, including the sidebar on desktop and the mobile navigation drawer. Its content is centered within a readable maximum width.

The core idea is an **item**. An item contains human-readable information and can have any number of links, files, and tags attached to it. When `item_type` is `custom`, the user can provide a custom label stored in `custom_type` so flexible records remain identifiable in lists and detail pages.

Example items:

- A customer profile with contact details, notes, and related documents.
- A software account with a login URL, username, and recovery notes.
- A project with links, images, videos, and meeting documents.
- A research topic with bookmarked URLs and uploaded reference files.

This keeps the product flexible without forcing every record to use the same CRM fields.

## 2. Recommended architecture

The existing stack is a good foundation:

- **Next.js App Router** for pages, server-rendered data, and route handlers.
- **Supabase Auth** for account registration, login, email confirmation, and sessions.
- **Supabase Postgres** for structured data and relationships.
- **Supabase Storage** for images, videos, PDFs, and other file objects.
- **Row Level Security (RLS)** so users can only access records they own or are explicitly allowed to access.

Files should not be stored directly inside database rows. The database should store file metadata and a storage object path; Supabase Storage should hold the actual file bytes.

## 3. Main data model

### profiles

Application-specific information for an authenticated user.

Suggested fields:

- `id` — references `auth.users.id`
- `display_name`
- `avatar_path`
- `created_at`
- `updated_at`

### collections

Optional folders or workspaces used to group items.

Suggested fields:

- `id`
- `owner_id`
- `name`
- `collection_type` — predefined types such as `general`, `work`, `personal`, `finance`, `projects`, or `bookmarks`, plus user-defined types up to 50 characters
- `description`
- `created_at`
- `updated_at`

### items

The main user-owned record.

Suggested fields:

- `id`
- `owner_id`
- `collection_id` — nullable
- `title`
- `item_type` — for example `contact`, `account`, `project`, `bookmark`, or `custom`
- `description`
- `structured_data` — JSONB for flexible fields
- `is_archived`
- `created_at`
- `updated_at`

The `structured_data` field allows the first version to support custom fields without creating a new database table for every possible use case. Frequently queried fields should eventually become normal typed columns.

### item_links

URLs associated with an item.

Suggested fields:

- `id`
- `item_id`
- `label`
- `url`
- `notes`
- `created_at`

URLs should be validated and normalized before saving. The application should allow `https://` links and reject unsafe protocols such as `javascript:`.

### attachments

Metadata for files stored in Supabase Storage.

Suggested fields:

- `id`
- `item_id`
- `owner_id`
- `storage_path`
- `original_name`
- `mime_type`
- `size_bytes`
- `width` and `height` for images when available
- `duration_seconds` for videos when available
- `created_at`

Recommended storage path:

```text
{owner_id}/{item_id}/{attachment_id}-{safe_filename}
```

### tags and item_tags

Many-to-many organization and filtering.

`tags` should contain `owner_id`, `name`, and an optional color. `item_tags` should contain `item_id` and `tag_id`.

### activity_events

Optional audit history for important actions such as creating, updating, archiving, or deleting an item. This should not store sensitive field values; it should only record the action and safe metadata.

## 4. Handling usernames, emails, and passwords

Emails and usernames can be stored as ordinary item fields when they belong to a record.

Passwords require special treatment:

- Never store passwords in plain text.
- Do not put passwords in logs, analytics, error messages, or search indexes.
- Supabase Auth should manage passwords for users who log into Vaultbase.
- If Vaultbase must store third-party credentials, treat that as a separate password-manager feature.
- The safer long-term design is client-side encryption using Web Crypto, with the encryption key unavailable to the server. This requires careful recovery and device-management design.

The current release supports optional encrypted credentials on an item. Users can save account names, usernames, emails, login URLs, notes, and an encrypted username/password payload.

The credential flow is: search for an account by safe metadata (for example, Facebook or AWS), open the account item, enter the vault passphrase, and reveal or copy the password only after an intentional user action. The password itself is never indexed in search, logged, or stored in plain text. The browser derives an AES-GCM encryption key from the vault passphrase; the passphrase is never sent to Supabase and is not stored by the application.

After unlocking an item, the user can edit the saved username/email and password. Saving requires a new vault passphrase so the browser re-encrypts the complete credential payload before sending only ciphertext, salt, and IV to the server. The original vault passphrase is never transmitted or recoverable by the application.

The regular Edit item modal clearly links to the protected Credentials section when an item has saved credentials. The password is not placed in the ordinary metadata form; the user must unlock it intentionally before editing or revealing it.

## 5. Search design

The planned search design should search:

- Item titles
- Descriptions
- Link labels and URLs
- Tag names
- Safe, non-secret structured fields

Start with a server-side Postgres search query. Add a generated `search_text` column or a `tsvector` column when the data model stabilizes. Add indexes for `owner_id`, `updated_at`, `item_type`, `collection_id`, and archived state.

Search should always include the current user's ownership filter. Never load all users' records into the browser and filter them there.

Later improvements can include:

- Full-text ranking
- Fuzzy matching
- Search by file name
- OCR or transcription for selected files
- Semantic search, only after privacy and cost implications are understood

Current implementation scope: search currently covers only items.title and items.description. It does not search passwords, encrypted credentials, links, or tags yet.

Collections have a debounced live search for collection name and description plus a type dropdown filter. Results update as the user types or changes the type, while filtering remains server-side, ownership-scoped, and handled through the authenticated user's Supabase query. New collections use a type dropdown for quick visual organization, with an `Other` option that reveals a validated custom type input; the selected type is shown on the collection list and detail page. The search has a clear button and keeps the current query and type in the URL for refresh and sharing within the user's session.

Collection detail pages use a clearly styled back button with an arrow icon so users can easily return to the collection list. An Edit collection button beside Add item opens a modal for updating the collection name, type, and description.

Collection creation uses an inline action state so validation and duplicate-name errors appear inside the form without exposing a Next.js runtime error overlay. The long Create new item form uses a responsive, scrollable modal body so credentials and attachments remain usable on small screens.

## 6. File and media handling

The upload flow should be:

1. Authenticate the user.
2. Create an item or confirm the target item.
3. Validate file size and allowed MIME type.
4. Create an attachment metadata record.
5. Upload the file to a user-scoped Storage path.
6. Show progress and handle cancellation.
7. Remove the metadata record if the upload fails.
8. Use signed URLs for private files rather than exposing public storage buckets.

The current create and edit forms allow images up to 10 MB, videos up to 100 MB, and PDF/text/CSV documents up to 25 MB, with a maximum of 10 files and 200 MB total per request. Existing attachments can be opened with a short-lived signed URL or deleted from the item detail page. New files are added during item editing; replacing a file is intentionally an explicit delete-then-add action so the user does not accidentally overwrite an existing file. These limits are enforced by the server action; production hardening should also validate file signatures, not only browser MIME values.

Do not trust the browser-provided MIME type alone. Validate the file signature and enforce limits on the server or through a controlled upload endpoint.

## 7. Security requirements

- Enable RLS on every user-owned table.
- Add policies for select, insert, update, and delete separately.
- Scope Storage policies to the user's path prefix.
- Use private buckets for user content.
- Never expose a Supabase service-role key in browser code.
- Validate every URL, file name, field, and query parameter on the server.
- Add rate limiting to authentication, search, and upload endpoints.
- Use soft delete or a recoverable archive before permanent deletion.
- Add export and account deletion workflows before production launch.
- Avoid rendering user-provided HTML without sanitization.

## 8. User experience

The first dashboard should contain:

- A global search bar.
- Unassigned items that have not yet been placed in a collection.
- Collections and tags.
- A button to create an item.
- Filters for item type, collection, tag, and archived state.
- A responsive item list/grid.

The item detail page should show:

- Title and type.
- Description and custom fields.
- Links.
- Attachments with previews where supported.
- Tags.
- Created and updated timestamps.
- Edit, archive, and delete actions.

Item editing is now available from the item detail page for title, type, collection, description, multiple URLs, tags, and new attachments. Existing attachments can be deleted beside their file name. Encrypted credentials have a separate unlock and edit flow so the username/email and password remain protected while ordinary item metadata is changed.

## 9. Suggested release boundaries

### Release 1: Private organizer

- Authenticated dashboard
- Create, view, edit, archive, and delete items
- Collections and tags
- URLs and notes
- Basic ownership and RLS
- Search across titles, descriptions, links, and tags

### Release 2: Attachments

- Private Supabase Storage bucket
- Image, PDF, and document uploads
- Attachment metadata
- Image previews and secure downloads
- Upload validation and size limits

### Release 3: Collaboration

- Shared collections
- Member roles
- Invitations
- Activity history
- Per-item permissions

### Release 4: Advanced features

- Video processing and thumbnails
- Import/export
- OCR or transcription
- Saved searches
- Optional encrypted secrets

