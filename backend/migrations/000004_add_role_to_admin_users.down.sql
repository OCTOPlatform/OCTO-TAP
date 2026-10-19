DELETE FROM admin_users WHERE email = 'sales@octotap.com';
ALTER TABLE admin_users DROP COLUMN IF EXISTS role;
