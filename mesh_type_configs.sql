-- Mesh Type Configurations Database Schema and Data
-- This replaces all hardcoded mesh configurations in CelikHasirHesaplama.jsx

-- Create the mesh_type_configs table
CREATE TABLE mesh_type_configs (
    id SERIAL PRIMARY KEY,
    hasir_tipi VARCHAR(50) UNIQUE NOT NULL,
    boy_cap DECIMAL(4,2) NOT NULL,
    en_cap DECIMAL(4,2) NOT NULL,
    boy_aralik DECIMAL(4,2) NOT NULL,
    en_aralik DECIMAL(4,2) NOT NULL,
    type VARCHAR(10) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_mesh_type_hasir_tipi ON mesh_type_configs(hasir_tipi);
CREATE INDEX idx_mesh_type_type ON mesh_type_configs(type);

-- Q/Q combinations (like Q106/106) are handled dynamically by processComplexHasirType()
-- Only individual Q types needed in database

-- Insert all R Type meshes (Reinforcement mesh)
INSERT INTO mesh_type_configs (hasir_tipi, boy_cap, en_cap, boy_aralik, en_aralik, type, description) VALUES
('R106', 4.5, 4.5, 15, 25, 'R', 'R type reinforcement mesh - 106kg/m³'),
('R131', 5.0, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 131kg/m³'),
('R158', 5.5, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 158kg/m³'),
('R188', 6.0, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 188kg/m³'),
('R221', 6.5, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 221kg/m³'),
('R257', 7.0, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 257kg/m³'),
('R295', 7.5, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 295kg/m³'),
('R317', 7.8, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 317kg/m³'),
('R335', 8.0, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 335kg/m³'),
('R377', 8.5, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 377kg/m³'),
('R378', 8.5, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 378kg/m³'),
('R389', 8.6, 5.0, 15, 25, 'R', 'R type reinforcement mesh - 389kg/m³'),
('R423', 9.0, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 423kg/m³'),
('R424', 9.0, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 424kg/m³'),
('R442', 9.2, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 442kg/m³'),
('R443', 9.2, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 443kg/m³'),
('R473', 9.5, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 473kg/m³'),
('R513', 9.9, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 513kg/m³'),
('R524', 10.0, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 524kg/m³'),
('R577', 10.5, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 577kg/m³'),
('R588', 10.6, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 588kg/m³'),
('R589', 10.6, 6.0, 15, 25, 'R', 'R type reinforcement mesh - 589kg/m³'),
('R634', 11.0, 6.5, 15, 25, 'R', 'R type reinforcement mesh - 634kg/m³'),
('R754', 12.0, 6.5, 15, 25, 'R', 'R type reinforcement mesh - 754kg/m³');

-- Insert all TR Type meshes (Truss reinforcement mesh)
INSERT INTO mesh_type_configs (hasir_tipi, boy_cap, en_cap, boy_aralik, en_aralik, type, description) VALUES
('TR106', 4.5, 4.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 106kg/m³'),
('TR131', 5.0, 5.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 131kg/m³'),
('TR158', 5.0, 5.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 158kg/m³'),
('TR188', 5.0, 6.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 188kg/m³'),
('TR221', 5.0, 6.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 221kg/m³'),
('TR257', 5.0, 7.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 257kg/m³'),
('TR295', 5.0, 7.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 295kg/m³'),
('TR317', 5.0, 7.8, 30, 15, 'TR', 'TR type truss reinforcement mesh - 317kg/m³'),
('TR335', 5.0, 8.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 335kg/m³'),
('TR377', 5.0, 8.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 377kg/m³'),
('TR378', 5.0, 8.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 378kg/m³'),
('TR389', 5.0, 8.6, 30, 15, 'TR', 'TR type truss reinforcement mesh - 389kg/m³'),
('TR423', 6.0, 9.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 423kg/m³'),
('TR424', 6.0, 9.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 424kg/m³'),
('TR442', 6.0, 9.2, 30, 15, 'TR', 'TR type truss reinforcement mesh - 442kg/m³'),
('TR443', 6.0, 9.2, 30, 15, 'TR', 'TR type truss reinforcement mesh - 443kg/m³'),
('TR473', 6.0, 9.2, 30, 15, 'TR', 'TR type truss reinforcement mesh - 473kg/m³'),
('TR513', 6.0, 9.9, 30, 15, 'TR', 'TR type truss reinforcement mesh - 513kg/m³'),
('TR524', 6.0, 10.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 524kg/m³'),
('TR577', 6.0, 10.5, 30, 15, 'TR', 'TR type truss reinforcement mesh - 577kg/m³'),
('TR588', 6.0, 10.6, 30, 15, 'TR', 'TR type truss reinforcement mesh - 588kg/m³'),
('TR589', 6.0, 10.6, 30, 15, 'TR', 'TR type truss reinforcement mesh - 589kg/m³'),
('TR634', 6.5, 11.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 634kg/m³'),
('TR754', 6.5, 12.0, 30, 15, 'TR', 'TR type truss reinforcement mesh - 754kg/m³');

-- Insert individual Q types (used for Q/Q combinations and single Q references)
INSERT INTO mesh_type_configs (hasir_tipi, boy_cap, en_cap, boy_aralik, en_aralik, type, description) VALUES
('Q106', 4.5, 4.5, 15, 15, 'Q', 'Q type mesh - 106 (used for Q106/106 combinations)'),
('Q131', 5.0, 5.0, 15, 15, 'Q', 'Q type mesh - 131 (used for Q131/131 combinations)'),
('Q158', 5.5, 5.5, 15, 15, 'Q', 'Q type mesh - 158 (used for Q158/158 combinations)'),
('Q188', 6.0, 6.0, 15, 15, 'Q', 'Q type mesh - 188 (used for Q188/188 combinations)'),
('Q221', 6.5, 6.5, 15, 15, 'Q', 'Q type mesh - 221 (used for Q221/221 combinations)'),
('Q257', 7.0, 7.0, 15, 15, 'Q', 'Q type mesh - 257 (used for Q257/257 combinations)'),
('Q295', 7.5, 7.5, 15, 15, 'Q', 'Q type mesh - 295 (used for Q295/295 combinations)'),
('Q317', 7.8, 7.8, 15, 15, 'Q', 'Q type mesh - 317 (used for Q317/317 combinations)'),
('Q335', 8.0, 8.0, 15, 15, 'Q', 'Q type mesh - 335 (used for Q335/335 combinations)'),
('Q377', 8.5, 8.5, 15, 15, 'Q', 'Q type mesh - 377 (used for Q377/377 combinations)'),
('Q378', 8.5, 8.5, 15, 15, 'Q', 'Q type mesh - 378 (used for Q378/378 combinations)'),
('Q389', 8.6, 8.6, 15, 15, 'Q', 'Q type mesh - 389 (used for Q389/389 combinations)'),
('Q423', 9.0, 9.0, 15, 15, 'Q', 'Q type mesh - 423 (used for Q423/423 combinations)'),
('Q424', 9.0, 9.0, 15, 15, 'Q', 'Q type mesh - 424 (used for Q424/424 combinations)'),
('Q442', 9.2, 9.2, 15, 15, 'Q', 'Q type mesh - 442 (used for Q442/442 combinations)'),
('Q443', 9.2, 9.2, 15, 15, 'Q', 'Q type mesh - 443 (used for Q443/443 combinations)'),
('Q473', 9.5, 9.5, 15, 15, 'Q', 'Q type mesh - 473 (used for Q473/473 combinations)'),
('Q513', 9.9, 9.9, 15, 15, 'Q', 'Q type mesh - 513 (used for Q513/513 combinations)'),
('Q524', 10.0, 10.0, 15, 15, 'Q', 'Q type mesh - 524 (used for Q524/524 combinations)'),
('Q577', 10.5, 10.5, 15, 15, 'Q', 'Q type mesh - 577 (used for Q577/577 combinations)'),
('Q588', 10.6, 10.6, 15, 15, 'Q', 'Q type mesh - 588 (used for Q588/588 combinations)'),
('Q589', 10.6, 10.6, 15, 15, 'Q', 'Q type mesh - 589 (used for Q589/589 combinations)'),
('Q634', 11.0, 11.0, 15, 15, 'Q', 'Q type mesh - 634 (used for Q634/634 combinations)'),
('Q754', 12.0, 12.0, 15, 15, 'Q', 'Q type mesh - 754 (used for Q754/754 combinations)');

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mesh_type_configs_updated_at 
    BEFORE UPDATE ON mesh_type_configs 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Verify the data - Should be 72 total records (24 Q + 24 R + 24 TR)
SELECT 
    type,
    COUNT(*) as count,
    MIN(boy_cap) as min_boy_cap,
    MAX(boy_cap) as max_boy_cap,
    MIN(en_cap) as min_en_cap,
    MAX(en_cap) as max_en_cap
FROM mesh_type_configs 
GROUP BY type 
ORDER BY type;

-- Total count verification
SELECT COUNT(*) as total_records FROM mesh_type_configs;

-- Sample queries for testing
-- SELECT * FROM mesh_type_configs WHERE hasir_tipi = 'R770'; -- Should return empty (unknown type)
-- SELECT * FROM mesh_type_configs WHERE hasir_tipi = 'TR589'; -- Should return existing config
-- SELECT * FROM mesh_type_configs WHERE hasir_tipi = 'Q257'; -- Should return Q257 for use in Q257/257 combinations
-- SELECT * FROM mesh_type_configs WHERE type = 'Q' ORDER BY boy_cap;

-- Test Q combination logic (handled by processComplexHasirType function)
-- Industry input: Q106/106 
-- System interprets as: Q106/Q106
-- Database lookup: Q106 (boy_cap=4.5, en_cap=4.5, spacing=15x15)
-- Result: Both boy and en use Q106 specifications