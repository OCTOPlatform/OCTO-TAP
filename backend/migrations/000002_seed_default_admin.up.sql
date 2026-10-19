-- Insert default admin if not exists
INSERT INTO admin_users (id, email, password_hash, full_name, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@octotap.com',
    '$2b$12$r9ql1EFzLi4acR0c5CEke.EKW5UjceHHtqfhu.Bl2.NsB1ylOI3nW',
    'OCTO Tap Administrator',
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample verified business for quick testing
INSERT INTO businesses (id, name, google_review_url, status, verified_at, verified_by, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Kopi Kenangan Senopati',
    'https://g.page/r/CbKenanganReviewSample/review',
    'ACTIVE',
    NOW(),
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
