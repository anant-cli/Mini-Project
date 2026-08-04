-- Sample seed data for local dev.
-- Password for all seed users is: Password123!  (real bcrypt hash below —
-- generated via `node -e "console.log(require('bcrypt').hashSync('Password123!',10))"`,
-- verified to round-trip with bcrypt.compareSync before committing)

INSERT INTO users (user_id, name, email, password_hash, phone, role, id_verified) VALUES
 (uuid_generate_v4(), 'Asha Rao',    'asha.driver@example.com',  '$2b$10$n2iOWOKeGrv/2LXr43QqvOo35uliJJzO6wkKFCTlzev/ja.fhmNbu', '9876500001', 'driver', true),
 (uuid_generate_v4(), 'Vikram Shah', 'vikram.host@example.com',  '$2b$10$n2iOWOKeGrv/2LXr43QqvOo35uliJJzO6wkKFCTlzev/ja.fhmNbu', '9876500002', 'host', true),
 (uuid_generate_v4(), 'City Mall Ops','mall.business@example.com','$2b$10$n2iOWOKeGrv/2LXr43QqvOo35uliJJzO6wkKFCTlzev/ja.fhmNbu', '9876500003', 'business_host', true),
 (uuid_generate_v4(), 'Platform Admin','admin@parkshare.app',     '$2b$10$n2iOWOKeGrv/2LXr43QqvOo35uliJJzO6wkKFCTlzev/ja.fhmNbu', '9876500000', 'admin', true);

