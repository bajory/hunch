-- ============================================================
-- Kit type dimension: home / away / third / fourth
-- Each kit type gets its own full calibration row (photo, colours,
-- geometry, patches, fonts) — a club's away kit is a different physical
-- shirt from its home kit, not a recolour of the same row.
-- Additive: existing rows backfill to kit_type 'home', preserving
-- today's one-kit-per-team-per-competition rows as the "home" kit.
-- ============================================================

alter table team_competition_kits
  add column if not exists kit_type text not null default 'home';

alter table team_competition_kits
  add constraint team_competition_kits_kit_type_check
    check (kit_type in ('home', 'away', 'third', 'fourth'));

-- Widen identity from (team, competition) to (team, competition, kit_type)
-- so a club can carry an away/third/fourth kit per competition.
alter table team_competition_kits
  drop constraint if exists team_competition_kits_team_id_competition_id_key;

alter table team_competition_kits
  add constraint team_competition_kits_identity_key
    unique (team_id, competition_id, kit_type);

create index if not exists team_competition_kits_kit_type_idx
  on team_competition_kits (kit_type);
