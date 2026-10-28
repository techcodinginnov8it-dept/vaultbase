# Vaultbase

Vaultbase is a private, searchable information workspace for contacts, accounts, projects, links, notes, and files.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage for private image, video, and document attachments

## Local setup

1. Install dependencies with npm install.
2. Create .env.local by copying .env.example.
3. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the Supabase project API settings.
4. Apply the Supabase migrations in filename order: `001_vaultbase_foundation.sql`, `002_authenticated_table_grants.sql`, `003_item_credentials.sql`, `004_collection_types.sql`, `005_custom_collection_types.sql`, `006_custom_item_types.sql`, `007_item_attachments.sql`, `008_data_integrity_hardening.sql`, `009_add_predefined_item_types.sql`, `010_collection_images.sql`, `011_collection_colors.sql`, `012_profile_images.sql`, and `013_item_type_fields.sql`.
5. Start the development server with `npm run dev`.
6. Open http://localhost:3000.

Without .env.local, the public page will show a configuration warning and authentication/database features will not work.

## Current features

- Supabase email/password authentication
- Authenticated Vaultbase dashboard
- User-owned items with RLS
- Item types, collections, tags, and multiple links per item
- Search by title and description
- Item detail pages
- Optional encrypted credentials with vault-passphrase unlock
- Custom item type labels for flexible records
- Private image, video, PDF, and text/CSV attachments with per-file and total upload limits
- Collections with predefined or custom types, live search, type filtering, and item assignment
- Settings for display name, password reset, and theme selection
- Responsive sidebar and success toasts for authentication actions

## Planned features

- Edit, archive, restore, and delete workflows for items
- Private image/document/video uploads
- Secure signed URLs
- Sharing and team permissions
- Import/export

Read the detailed design and implementation plan:

- docs/system-design.md
- docs/implementation-roadmap.md
