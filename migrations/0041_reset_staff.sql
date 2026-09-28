-- One-time owner reset. Clears every staff row, including the locked super admin,
-- so the next signed-in member who opens the console can claim it fresh.
DELETE FROM nf_staff;
