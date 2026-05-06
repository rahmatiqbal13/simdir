-- ============================================
-- DEFAULT DATA FOR PENGATURAN
-- ============================================

-- Insert default unit kerja if not exists
INSERT INTO unit_kerja (nama, kode, deskripsi, is_active) VALUES
  ('USC', 'USC', 'Unesa Science Center', true),
  ('PUI Keolahragaan', 'PUI-Olahraga', 'Pusat Unggulan Iptek Keolahragaan', true),
  ('PUI Disabilitas', 'PUI-Disabilitas', 'Pusat Unggulan Iptek Disabilitas', true),
  ('PUI Seni Budaya', 'PUI-Seni', 'Pusat Unggulan Iptek Seni Budaya', true),
  ('Kolam Renang', 'KR', 'Fasilitas Kolam Renang', true),
  ('Driving Golf', 'Golf', 'Fasilitas Driving Golf', true),
  ('ULABK', 'ULABK', 'Unit Layanan Administrasi Bisnis dan Kemitraan', true),
  ('SSFC', 'SSFC', 'Surabaya Sport Science and Fitness Center', true),
  ('PUIPT Seni Budaya Majapahitan', 'PUIPT-SBM', 'Pusat Unggulan Iptek Seni Budaya Majapahitan', true),
  ('PUIPT DIC', 'PUIPT-DIC', 'Pusat Unggulan Iptek Digital Innovation Center', true),
  ('PUIPT SERC', 'PUIPT-SERC', 'Pusat Unggulan Iptek Sports Education and Research Center', false)
ON CONFLICT (nama) DO NOTHING;

-- Insert default users if not exists (password: password123)
INSERT INTO users (username, email, password, full_name, role, is_active) VALUES
  ('adminiqbal', 'adminiqbal@usc.ac.id', 'password123', 'Administrator Iqbal', 'super_admin', true),
  ('budi.santoso', 'budi@usc.ac.id', 'password123', 'Budi Santoso', 'admin_keuangan', true),
  ('siti.rahayu', 'siti@usc.ac.id', 'password123', 'Siti Rahayu', 'admin', true)
ON CONFLICT (username) DO NOTHING;
