-- Add role column to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'ADMIN';

-- Seed default sales user: sales@octotap.com / password: password123
INSERT INTO admin_users (id, email, password_hash, full_name, role, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'sales@octotap.com',
    '$2b$12$l1lpkCu1492QM04yeELuuelu9cpZ/aFRoerl5TtEB/FDzeLW6Wrne',
    'Tim Sales OCTO-TAP',
    'SALES',
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET role = 'SALES', password_hash = '$2b$12$l1lpkCu1492QM04yeELuuelu9cpZ/aFRoerl5TtEB/FDzeLW6Wrne';
