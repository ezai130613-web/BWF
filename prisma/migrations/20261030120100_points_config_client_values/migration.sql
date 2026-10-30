-- Separate migration: a new enum value can't be used in the transaction that
-- added it. Client's values (2026-10-30), still editable in /admin/points-config.
INSERT INTO "points_config" ("id", "activityType", "points", "perUnit", "updatedAt")
VALUES ('points_config_attendance', 'ATTENDANCE', 50, 1, NOW())
ON CONFLICT ("activityType") DO NOTHING;

INSERT INTO "points_config" ("id", "activityType", "points", "perUnit", "updatedAt")
VALUES
    ('points_config_thank_you_slip', 'THANK_YOU_SLIP', 1, 500, NOW()),
    ('points_config_power_date', 'POWER_DATE', 50, 1, NOW())
ON CONFLICT ("activityType") DO UPDATE SET "points" = EXCLUDED."points", "perUnit" = EXCLUDED."perUnit", "updatedAt" = NOW();
