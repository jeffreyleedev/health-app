-- Optional display name, shown on the Settings page instead of the email.
--
-- Asked at profile setup and editable in Settings, so it lives on the
-- profile row and goes through the same data layer as the other stats.
-- Existing rows get NULL (no name); the app falls back to the email.
--
-- The app validates the name too; these checks make sure nothing can
-- store a value the app would refuse:
--   - 1 to 50 characters (a blank name is stored as NULL, not '')
--   - no spaces at either end (the app trims them)
--   - no control characters (tabs, newlines, invisible characters)
--
-- No new grants or policies: 0002's table grant to service_role covers
-- new columns, and RLS (0001) still denies the browser's roles.

alter table public.profiles
  add column display_name text
    constraint profiles_display_name_valid check (
      display_name is null
      or (
        char_length(display_name) between 1 and 50
        and display_name = btrim(display_name)
        and display_name !~ '[[:cntrl:]]'
      )
    );
