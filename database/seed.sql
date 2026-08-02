-- Sample seed data for local dev.
-- Password for all seed users is: Password123!  (bcrypt hash below)

INSERT INTO users (user_id, name, email, password_hash, phone, role, id_verified) VALUES
 (uuid_generate_v4(), 'Asha Rao',    'asha.driver@example.com',  '$2b$10$Q0Yy8kQeYb1v3z6r0m8p3.examplehashaaaaaaaaaaaaaaaaaaaaa', '9876500001', 'driver', true),
 (uuid_generate_v4(), 'Vikram Shah', 'vikram.host@example.com',  '$2b$10$Q0Yy8kQeYb1v3z6r0m8p3.examplehashaaaaaaaaaaaaaaaaaaaaa', '9876500002', 'host', true),
 (uuid_generate_v4(), 'City Mall Ops','mall.business@example.com','$2b$10$Q0Yy8kQeYb1v3z6r0m8p3.examplehashaaaaaaaaaaaaaaaaaaaaa', '9876500003', 'business_host', true),
 (uuid_generate_v4(), 'Platform Admin','admin@parkshare.app',     '$2b$10$Q0Yy8kQeYb1v3z6r0m8p3.examplehashaaaaaaaaaaaaaaaaaaaaa', '9876500000', 'admin', true);

-- NOTE: replace the password_hash values above with real bcrypt hashes
-- generated via `node -e "console.log(require('bcrypt').hashSync('Password123!',10))"`
-- before using this seed file — the placeholders above are illustrative only.
