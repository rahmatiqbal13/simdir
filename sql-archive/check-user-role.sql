-- Cek data user di database
SELECT id, username, email, role, is_active 
FROM users 
WHERE username = 'adminiqbal';

-- Cek data di profiles juga
SELECT * FROM profiles WHERE email = 'adminiqbal@usc.ac.id';
