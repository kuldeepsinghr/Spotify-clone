-- CreateEnum
CREATE TYPE "ArtistStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ArtistType" AS ENUM ('solo', 'band', 'duo', 'group', 'dj', 'orchestra', 'other');

-- CreateEnum
CREATE TYPE "LinkPlatform" AS ENUM ('instagram', 'youtube', 'x', 'facebook', 'tiktok', 'soundcloud', 'website');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('single', 'ep', 'album', 'compilation');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('draft', 'in_review', 'rejected', 'scheduled', 'published', 'taken_down');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "CreditRole" AS ENUM ('songwriter', 'composer', 'producer', 'other');

-- CreateEnum
CREATE TYPE "TrackArtistRole" AS ENUM ('main', 'featured');

-- CreateEnum
CREATE TYPE "ReviewSubject" AS ENUM ('artist', 'release');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReportSubject" AS ENUM ('artist', 'track', 'release');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- DropIndex
DROP INDEX "tracks_album_id_track_number_key";

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "copyright_c" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "copyright_p" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cover_public_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "is_catalog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "primary_genre_id" UUID,
ADD COLUMN     "published_at" TIMESTAMPTZ(3),
ADD COLUMN     "rejection_hint" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "rights_confirmed_at" TIMESTAMPTZ(3),
ADD COLUMN     "secondary_genre_id" UUID,
ADD COLUMN     "status" "ReleaseStatus" NOT NULL DEFAULT 'published',
ADD COLUMN     "type" "ReleaseType" NOT NULL DEFAULT 'album',
ADD COLUMN     "upc" TEXT;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "approved_at" TIMESTAMPTZ(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "artist_type" "ArtistType" NOT NULL DEFAULT 'solo',
ADD COLUMN     "banner_image_url" TEXT,
ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "featured_track_id" UUID,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "long_bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rejection_hint" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN     "status" "ArtistStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN     "submitted_at" TIMESTAMPTZ(3),
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "year_formed" INTEGER;

-- AlterTable
ALTER TABLE "play_history" ADD COLUMN     "ms_played" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "audio_public_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "disc_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "is_explicit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isrc" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lyrics" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "processing_error" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'ready';

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_private_details" (
    "artist_id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL DEFAULT '',
    "contact_email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "proof_url" TEXT,
    "management" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "artist_private_details_pkey" PRIMARY KEY ("artist_id")
);

-- CreateTable
CREATE TABLE "artist_links" (
    "id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "platform" "LinkPlatform" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "artist_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_members" (
    "id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "artist_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_gallery" (
    "id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "artist_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_genres" (
    "artist_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,

    CONSTRAINT "artist_genres_pkey" PRIMARY KEY ("artist_id","genre_id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_artists" (
    "track_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "role" "TrackArtistRole" NOT NULL DEFAULT 'featured',

    CONSTRAINT "track_artists_pkey" PRIMARY KEY ("track_id","artist_id")
);

-- CreateTable
CREATE TABLE "track_credits" (
    "id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "person_name" TEXT NOT NULL,
    "role" "CreditRole" NOT NULL,

    CONSTRAINT "track_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL,
    "subject_type" "ReviewSubject" NOT NULL,
    "subject_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "hint" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "hint" TEXT NOT NULL DEFAULT '',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "subject_type" "ReportSubject" NOT NULL,
    "subject_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_links_artist_id_platform_key" ON "artist_links"("artist_id", "platform");

-- CreateIndex
CREATE INDEX "artist_members_artist_id_position_idx" ON "artist_members"("artist_id", "position");

-- CreateIndex
CREATE INDEX "artist_gallery_artist_id_position_idx" ON "artist_gallery"("artist_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE INDEX "track_credits_track_id_idx" ON "track_credits"("track_id");

-- CreateIndex
CREATE INDEX "review_events_subject_type_subject_id_created_at_idx" ON "review_events"("subject_type", "subject_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_subject_type_subject_id_idx" ON "audit_log"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "albums_artist_id_status_idx" ON "albums"("artist_id", "status");

-- CreateIndex
CREATE INDEX "albums_status_released_at_idx" ON "albums"("status", "released_at");

-- CreateIndex
CREATE UNIQUE INDEX "artists_slug_key" ON "artists"("slug");

-- CreateIndex
CREATE INDEX "artists_status_idx" ON "artists"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_album_id_disc_number_track_number_key" ON "tracks"("album_id", "disc_number", "track_number");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_featured_track_id_fkey" FOREIGN KEY ("featured_track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_private_details" ADD CONSTRAINT "artist_private_details_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_links" ADD CONSTRAINT "artist_links_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_members" ADD CONSTRAINT "artist_members_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_gallery" ADD CONSTRAINT "artist_gallery_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_primary_genre_id_fkey" FOREIGN KEY ("primary_genre_id") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_secondary_genre_id_fkey" FOREIGN KEY ("secondary_genre_id") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
