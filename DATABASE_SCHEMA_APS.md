# APS SYSTEM DATABASE SCHEMA
## Albayrak Demir Çelik Factory - Advanced Planning & Scheduling

### Overview
This database schema supports the unified APS system with horizontal process tracking from filmaşin to sevkiyat, OR-Tools optimization, and dependency management.

---

## CORE TABLES

### 1. PRODUCTS Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    stok_kodu VARCHAR(50) UNIQUE NOT NULL,           -- GT.NIT.0122.00
    stok_adi VARCHAR(255) NOT NULL,                  -- "Galvanizli Tel NIT 1.22mm"
    line_type VARCHAR(50) NOT NULL,                  -- 'galvaniz', 'panel', 'tel_cekme', etc.
    production_time_per_kg DECIMAL(8,4) NOT NULL,    -- Minutes per kg
    unit VARCHAR(20) DEFAULT 'kg',                   -- 'kg', 'adet', 'm'
    category VARCHAR(50),                            -- 'mamul', 'yari_mamul', 'hammadde'
    is_active BOOLEAN DEFAULT TRUE,
    setup_requirements JSONB,                       -- Special setup needs
    quality_parameters JSONB,                       -- Quality specs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_products_stok_kodu ON products(stok_kodu);
CREATE INDEX idx_products_line_type ON products(line_type);
```

### 2. PRODUCT_DEPENDENCIES Table
```sql
CREATE TABLE product_dependencies (
    id SERIAL PRIMARY KEY,
    parent_product_id INTEGER REFERENCES products(id),
    child_product_id INTEGER REFERENCES products(id),
    quantity_ratio DECIMAL(8,4) NOT NULL,           -- How much child needed per parent
    process_stage VARCHAR(50) NOT NULL,             -- 'filmasin', 'tel_cekme', 'galvaniz', etc.
    is_critical BOOLEAN DEFAULT FALSE,              -- Critical path dependency
    lead_time_hours DECIMAL(8,2),                   -- Processing time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite unique constraint
ALTER TABLE product_dependencies ADD CONSTRAINT unique_dependency 
UNIQUE (parent_product_id, child_product_id, process_stage);
```

### 3. MACHINES Table
```sql
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    machine_code VARCHAR(20) UNIQUE NOT NULL,       -- 'TC1', 'KAFA-15', 'PCK01'
    name VARCHAR(100) NOT NULL,                     -- 'Tel Çekme 1', 'Galvaniz Kafa 15'
    line_type VARCHAR(50) NOT NULL,                 -- 'tel_cekme', 'galvaniz', 'panel'
    status VARCHAR(20) DEFAULT 'idle',              -- 'running', 'idle', 'maintenance', 'setup'
    efficiency_percent INTEGER DEFAULT 100,        -- Current efficiency %
    max_capacity_per_hour DECIMAL(10,2),           -- kg/hour or adet/hour
    power_rating_kw DECIMAL(8,2),                  -- Electrical consumption
    operator_requirement INTEGER DEFAULT 1,        -- Number of operators needed
    is_active BOOLEAN DEFAULT TRUE,
    last_maintenance DATE,
    next_maintenance DATE,
    setup_time_remaining_minutes INTEGER DEFAULT 0,
    current_order_id INTEGER,                      -- Foreign key to orders
    specifications JSONB,                          -- Machine-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_machines_line_type ON machines(line_type);
CREATE INDEX idx_machines_status ON machines(status);
```

### 4. ORDERS Table
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,       -- 'ORD-2024-001'
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    priority VARCHAR(20) DEFAULT 'medium',          -- 'high', 'medium', 'low'
    due_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',           -- 'pending', 'in_progress', 'completed', 'blocked', 'cancelled'
    current_stage VARCHAR(50),                      -- Current production stage
    estimated_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    total_cost DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_orders_due_date ON orders(due_date);
```

### 5. ORDER_STAGES Table (Horizontal Process Tracking)
```sql
CREATE TABLE order_stages (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL,               -- 'filmasin', 'tel_cekme', 'galvaniz', etc.
    stage_order INTEGER NOT NULL,                  -- Sequence number (1, 2, 3...)
    product_needed VARCHAR(255),                   -- Description of what's needed
    status VARCHAR(30) DEFAULT 'not_started',      -- 'not_started', 'ready', 'in_progress', 'completed', 'blocked'
    assigned_machine_id INTEGER REFERENCES machines(id),
    estimated_start TIMESTAMP,
    estimated_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    duration_hours DECIMAL(8,2),                   -- Estimated duration
    operator_assigned VARCHAR(100),
    dependencies JSONB,                            -- Previous stages that must complete
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite index for order timeline
CREATE INDEX idx_order_stages_order_sequence ON order_stages(order_id, stage_order);
CREATE INDEX idx_order_stages_status ON order_stages(status);
```

---

## SCHEDULING & OPTIMIZATION TABLES

### 6. MACHINE_SCHEDULE Table (OR-Tools Results)
```sql
CREATE TABLE machine_schedule (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id),
    order_stage_id INTEGER REFERENCES order_stages(id),
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    optimization_run_id VARCHAR(50),               -- Links to OR-Tools run
    is_optimized BOOLEAN DEFAULT TRUE,             -- OR-Tools vs manual assignment
    priority_score DECIMAL(8,2),                   -- OR-Tools calculated priority
    setup_time_minutes INTEGER DEFAULT 0,
    processing_time_minutes INTEGER NOT NULL,
    efficiency_factor DECIMAL(4,2) DEFAULT 1.0,   -- Applied efficiency
    status VARCHAR(20) DEFAULT 'scheduled',        -- 'scheduled', 'in_progress', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prevent double booking
CREATE UNIQUE INDEX idx_machine_schedule_conflict 
ON machine_schedule(machine_id, scheduled_start, scheduled_end);
```

### 7. SETUP_TIMES Table
```sql
CREATE TABLE setup_times (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id),
    from_product_id INTEGER REFERENCES products(id),
    to_product_id INTEGER REFERENCES products(id),
    setup_minutes INTEGER NOT NULL,
    difficulty_level INTEGER DEFAULT 1,            -- 1-5 scale
    requires_specialist BOOLEAN DEFAULT FALSE,
    last_measured_at TIMESTAMP,
    confidence_level INTEGER DEFAULT 80,           -- Data reliability %
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite unique constraint
ALTER TABLE setup_times ADD CONSTRAINT unique_setup_transition 
UNIQUE (machine_id, from_product_id, to_product_id);
```

### 8. MACHINE_QUEUE Table
```sql
CREATE TABLE machine_queue (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id),
    order_stage_id INTEGER REFERENCES order_stages(id),
    queue_position INTEGER NOT NULL,
    estimated_start TIMESTAMP,
    is_optimized_order BOOLEAN DEFAULT FALSE,      -- OR-Tools sequencing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure unique queue positions per machine
CREATE UNIQUE INDEX idx_machine_queue_position 
ON machine_queue(machine_id, queue_position);
```

---

## STOCK & INVENTORY TABLES

### 9. STOCK_LOCATIONS Table
```sql
CREATE TABLE stock_locations (
    id SERIAL PRIMARY KEY,
    location_code VARCHAR(20) UNIQUE NOT NULL,     -- 'HAMMADDE_1', 'MAMUL_PANEL'
    location_name VARCHAR(100) NOT NULL,
    location_type VARCHAR(30),                     -- 'hammadde', 'yari_mamul', 'mamul'
    capacity_limit DECIMAL(12,2),                  -- kg or adet
    current_occupancy DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 10. STOCK Table
```sql
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    location_id INTEGER REFERENCES stock_locations(id),
    quantity_available DECIMAL(12,2) NOT NULL,
    quantity_reserved DECIMAL(12,2) DEFAULT 0,     -- Reserved for orders
    minimum_stock_level DECIMAL(12,2) DEFAULT 0,   -- Reorder point
    maximum_stock_level DECIMAL(12,2),
    unit_cost DECIMAL(10,2),
    last_movement_date TIMESTAMP,
    expiry_date DATE,                               -- For materials with shelf life
    quality_status VARCHAR(20) DEFAULT 'ok',       -- 'ok', 'quarantine', 'rejected'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite unique constraint for product-location
ALTER TABLE stock ADD CONSTRAINT unique_product_location 
UNIQUE (product_id, location_id);
```

### 11. STOCK_MOVEMENTS Table
```sql
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    location_id INTEGER REFERENCES stock_locations(id),
    movement_type VARCHAR(20) NOT NULL,            -- 'in', 'out', 'transfer', 'adjustment'
    quantity DECIMAL(12,2) NOT NULL,
    reference_type VARCHAR(30),                    -- 'order', 'purchase', 'production', 'adjustment'
    reference_id INTEGER,                          -- ID of related order/purchase/etc
    unit_cost DECIMAL(10,2),
    operator VARCHAR(100),
    notes TEXT,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for stock history
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, movement_date);
```

---

## SUPPORTING TABLES

### 12. CUSTOMERS Table
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    payment_terms INTEGER DEFAULT 30,              -- Days
    priority_level INTEGER DEFAULT 3,              -- 1-5, affects scheduling
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13. PRODUCTION_LINES Table
```sql
CREATE TABLE production_lines (
    id SERIAL PRIMARY KEY,
    line_code VARCHAR(30) UNIQUE NOT NULL,         -- 'TEL_CEKME', 'GALVANIZ', 'PANEL_CIT'
    line_name VARCHAR(100) NOT NULL,
    capacity_per_day DECIMAL(12,2),                -- kg/day
    operating_hours_per_day DECIMAL(4,1) DEFAULT 24,
    efficiency_target DECIMAL(4,1) DEFAULT 85.0,  -- Target efficiency %
    current_efficiency DECIMAL(4,1),
    operator_count INTEGER,
    is_bottleneck BOOLEAN DEFAULT FALSE,           -- Marked by APS system
    maintenance_schedule VARCHAR(50),              -- 'weekly', 'monthly'
    last_analysis_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 14. HELPER_MATERIALS Table (For Order Details)
```sql
CREATE TABLE helper_materials (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    material_name VARCHAR(100) NOT NULL,           -- 'Çinko', 'Asit (HCl)', 'Boya RAL6005'
    consumption_ratio DECIMAL(8,4) NOT NULL,       -- Per kg of main product
    unit VARCHAR(20) NOT NULL,                     -- 'kg', 'L', 'adet'
    current_stock DECIMAL(12,2),
    minimum_stock DECIMAL(12,2),
    supplier VARCHAR(100),
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 15. OR_TOOLS_RUNS Table (Optimization History)
```sql
CREATE TABLE or_tools_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(50) UNIQUE NOT NULL,
    run_type VARCHAR(30),                          -- 'schedule_optimization', 'capacity_planning'
    input_parameters JSONB,                        -- Constraints and objectives
    solution_status VARCHAR(20),                   -- 'OPTIMAL', 'FEASIBLE', 'INFEASIBLE'
    objective_value DECIMAL(15,2),                 -- Optimization result
    computation_time_seconds DECIMAL(8,2),
    orders_optimized INTEGER,
    machines_utilized INTEGER,
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results_summary JSONB                          -- Key metrics and assignments
);
```

---

## VIEWS FOR DASHBOARD

### 16. Machine Status Dashboard View
```sql
CREATE VIEW machine_status_dashboard AS
SELECT 
    m.id,
    m.machine_code,
    m.name,
    m.line_type,
    m.status,
    m.efficiency_percent,
    m.current_order_id,
    o.order_number AS current_order,
    COUNT(mq.id) AS queue_length,
    COALESCE(ms.scheduled_end, NOW()) AS next_available
FROM machines m
LEFT JOIN orders o ON m.current_order_id = o.id
LEFT JOIN machine_queue mq ON m.id = mq.machine_id
LEFT JOIN machine_schedule ms ON m.id = ms.machine_id 
    AND ms.status = 'in_progress'
WHERE m.is_active = TRUE
GROUP BY m.id, m.machine_code, m.name, m.line_type, m.status, 
         m.efficiency_percent, m.current_order_id, o.order_number, ms.scheduled_end;
```

### 17. Order Progress Timeline View
```sql
CREATE VIEW order_progress_timeline AS
SELECT 
    o.id AS order_id,
    o.order_number,
    o.priority,
    p.stok_adi AS product_name,
    o.quantity,
    o.due_date,
    os.stage_name,
    os.stage_order,
    os.status AS stage_status,
    os.estimated_start,
    os.estimated_end,
    os.actual_start,
    os.actual_end,
    m.name AS assigned_machine
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN order_stages os ON o.id = os.order_id
LEFT JOIN machines m ON os.assigned_machine_id = m.id
WHERE o.status IN ('pending', 'in_progress', 'blocked')
ORDER BY o.priority DESC, o.due_date ASC, os.stage_order ASC;
```

---

## INITIALIZATION DATA

### Sample Data Insertion Scripts
```sql
-- Insert Production Lines
INSERT INTO production_lines (line_code, line_name, capacity_per_day, operator_count) VALUES
('TEL_CEKME', 'Tel Çekme Hattı', 15000.00, 4),
('GALVANIZ', 'Galvaniz Hattı', 128500.00, 27),
('PANEL_CIT', 'Panel Çit Hattı', 800.00, 12),
('CELIK_HASIR', 'Çelik Hasır Hattı', 2000.00, 15),
('CIVI', 'Çivi Hattı', 8000.00, 7),
('TAVLI_TEL', 'Tavlı Tel Hattı', 5500.00, 2),
('PROFIL', 'Profil Hattı', 400.00, 2);

-- Insert Products from CSV data
INSERT INTO products (stok_kodu, stok_adi, line_type, production_time_per_kg) VALUES
('GT.NIT.0122.00', 'Galvanizli Tel NIT 1.22mm', 'galvaniz', 0.19),
('2D.0740.0540.2500.2030.51.6005', 'Panel Çit 2D 830x2500mm RAL6005', 'panel', 2.4),
('CH.STD.0450.00', 'Çelik Hasır Standard 450mm', 'hasir', 0.5),
('CV.DKM.01', 'Dökme Çivi 2.5x50mm', 'civi', 10.0);

-- Insert Machines (based on mermaid flow)
INSERT INTO machines (machine_code, name, line_type, max_capacity_per_hour, operator_requirement) VALUES
('TC1', 'Tel Çekme 1', 'tel_cekme', 800.0, 1),
('TC2', 'Tel Çekme 2', 'tel_cekme', 800.0, 1),
-- ... (9 tel çekme machines total)
('KAFA-1', 'Galvaniz Kafa 1', 'galvaniz', 150.0, 1),
('KAFA-2', 'Galvaniz Kafa 2', 'galvaniz', 150.0, 1);
-- ... (36 galvaniz kafalar total)
```

---

This comprehensive database schema supports:

✅ **Unified APS Dashboard** - All data structures for machine/order views
✅ **Horizontal Process Tracking** - Complete filmaşin→sevkıyat timeline  
✅ **OR-Tools Integration** - Optimization results storage and machine scheduling
✅ **Product Dependencies** - Multi-stage production relationships
✅ **Stock Management** - Raw materials and finished goods tracking
✅ **Setup Time Management** - Machine transition optimizations  
✅ **Performance Analytics** - Efficiency and capacity utilization data

The schema is optimized for the factory's 8 production lines and supports both manual and OR-Tools automated scheduling workflows.