alter table team_competition_kits
  add column if not exists sleeve_rotation numeric default 0;
