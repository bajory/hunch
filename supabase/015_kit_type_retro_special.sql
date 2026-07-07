-- ============================================================
-- Retro / special-edition jerseys are full products with their own
-- calibration rows — widen the calibration kit_type set so a retro
-- or special kit can be photographed, calibrated, and personalised
-- exactly like home/away/third/fourth. The unique key from 004
-- (team_id, competition_id, kit_type) already accommodates them.
-- ============================================================

alter table team_competition_kits
  drop constraint team_competition_kits_kit_type_check;

alter table team_competition_kits
  add constraint team_competition_kits_kit_type_check
    check (kit_type in ('home', 'away', 'third', 'fourth', 'retro', 'special'));
