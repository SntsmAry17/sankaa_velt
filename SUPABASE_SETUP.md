# Private anonymous inbox setup

The page's question and drawing forms use Supabase. Visitors do not enter a name,
email, account, or social handle. Questions and drawing notes are limited in
length. Drawing images are PNG files stored in a private bucket.

## Connect a Supabase project

1. Create a Supabase project and open its SQL Editor.
2. In Storage, create a bucket named `anonymous-doodles`. Keep it **Private**, set
   the file size limit to **3 MB**, and allow only `image/png`.
3. Run `supabase-setup.sql` in the SQL Editor.
4. Open Project Settings / API Keys and copy the **Project URL** and the
   **publishable key** into `supabase-config.js`.
5. Do not put a secret key or service-role key in `supabase-config.js`.

The publishable key is visible in the website's source, so the SQL grants and
RLS policies are essential. Visitors can insert valid submissions and upload
PNG drawings, but have no read, edit, delete, or file-download access. Review
the messages in the `submissions` table and drawings in the private Storage
bucket from your Supabase Dashboard.

The website does not store sender names, emails, account IDs, or IP addresses
with submissions. Supabase still processes technical request data to operate
the service; this setup makes submissions anonymous to the page owner, like a
Straw.page Gimmick, but does not promise anonymity from the hosting provider.

The forms include a honeypot field and file/type/size limits. A public inbox can
still receive spam; stronger bot protection can be added before publishing if
needed.
