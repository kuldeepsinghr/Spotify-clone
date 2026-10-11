ALTER TABLE "artists" ADD COLUMN "slug_locked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "artists" SET "languages" = ARRAY[]::TEXT[] WHERE "languages" IS NULL;
ALTER TABLE "artists" ALTER COLUMN "languages" SET NOT NULL;

UPDATE "artists"
SET "slug" = COALESCE(
  NULLIF(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''),
  'artist'
) || '-' || substr("id"::text, 1, 8)
WHERE "slug" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

CREATE OR REPLACE FUNCTION assert_published_release_artist()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND NOT EXISTS (
    SELECT 1 FROM artists WHERE id = NEW.artist_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'A published release requires an approved artist';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS albums_published_artist ON albums;
CREATE TRIGGER albums_published_artist
BEFORE INSERT OR UPDATE OF status, artist_id ON albums
FOR EACH ROW
EXECUTE FUNCTION assert_published_release_artist();

INSERT INTO "genres" ("id", "name", "slug") VALUES
  (gen_random_uuid(), 'Pop', 'pop'),
  (gen_random_uuid(), 'Rock', 'rock'),
  (gen_random_uuid(), 'Hip-Hop', 'hip-hop'),
  (gen_random_uuid(), 'R&B', 'r-and-b'),
  (gen_random_uuid(), 'Electronic', 'electronic'),
  (gen_random_uuid(), 'Jazz', 'jazz'),
  (gen_random_uuid(), 'Classical', 'classical'),
  (gen_random_uuid(), 'Country', 'country'),
  (gen_random_uuid(), 'Folk', 'folk'),
  (gen_random_uuid(), 'Metal', 'metal'),
  (gen_random_uuid(), 'Indie', 'indie'),
  (gen_random_uuid(), 'Latin', 'latin'),
  (gen_random_uuid(), 'Reggae', 'reggae'),
  (gen_random_uuid(), 'Blues', 'blues'),
  (gen_random_uuid(), 'Soul', 'soul'),
  (gen_random_uuid(), 'Dance', 'dance'),
  (gen_random_uuid(), 'Alternative', 'alternative'),
  (gen_random_uuid(), 'Soundtrack', 'soundtrack')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "countries" ("id", "code", "name") VALUES
  (gen_random_uuid(), 'US', 'United States'),
  (gen_random_uuid(), 'GB', 'United Kingdom'),
  (gen_random_uuid(), 'CA', 'Canada'),
  (gen_random_uuid(), 'IN', 'India'),
  (gen_random_uuid(), 'AU', 'Australia'),
  (gen_random_uuid(), 'DE', 'Germany'),
  (gen_random_uuid(), 'FR', 'France'),
  (gen_random_uuid(), 'BR', 'Brazil'),
  (gen_random_uuid(), 'MX', 'Mexico'),
  (gen_random_uuid(), 'JP', 'Japan'),
  (gen_random_uuid(), 'KR', 'South Korea'),
  (gen_random_uuid(), 'NG', 'Nigeria'),
  (gen_random_uuid(), 'ZA', 'South Africa'),
  (gen_random_uuid(), 'SE', 'Sweden'),
  (gen_random_uuid(), 'NL', 'Netherlands'),
  (gen_random_uuid(), 'ES', 'Spain'),
  (gen_random_uuid(), 'IT', 'Italy'),
  (gen_random_uuid(), 'IE', 'Ireland'),
  (gen_random_uuid(), 'NZ', 'New Zealand'),
  (gen_random_uuid(), 'PH', 'Philippines')
ON CONFLICT ("code") DO NOTHING;
