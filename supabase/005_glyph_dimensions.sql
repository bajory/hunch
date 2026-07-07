-- Number glyphs (per-digit SVGs) are laid out side by side for multi-digit
-- numbers. Without knowing each glyph's real aspect ratio, the renderer had
-- to assume every digit was the same width, which visibly mis-centers numbers
-- whenever digits differ in shape (e.g. "1" vs "0"). Store the natural pixel
-- size at upload time so each digit gets its own correct width.

alter table number_glyphs
  add column if not exists glyph_w int,
  add column if not exists glyph_h int;
