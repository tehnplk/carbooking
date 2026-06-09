# Car Booking Database Schema

## ตาราง Master Tables (ตารางหลัก)

### 1. users (ผู้ใช้งาน)

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    fullname VARCHAR(150),
    department VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 2. cars (รถยนต์)

```sql
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    license_plate VARCHAR(50) NOT NULL,
    seats INTEGER,
    car_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    image_url VARCHAR(255),
    car_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 3. car_type (ประเภทรถ)

```sql
CREATE TABLE IF NOT EXISTS car_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 4. driver_type (ประเภทพนักงานขับรถ)

```sql
CREATE TABLE IF NOT EXISTS driver_type (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL,
    driver_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 5. drivers (พนักงานขับรถ)

```sql
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    driver_type_code VARCHAR(2) NOT NULL DEFAULT '01' REFERENCES driver_type(code),
    is_active BOOLEAN DEFAULT true,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 6. booking_status (สถานะการจอง)

```sql
CREATE TABLE IF NOT EXISTS booking_status (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 7. department (แผนก/กลุ่มงาน)

```sql
CREATE TABLE IF NOT EXISTS department (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 8. trip_type (ประเภททริป)

```sql
CREATE TABLE IF NOT EXISTS trip_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 9. fuel_reimbursement (ค่าเชื้อเพลิง)

```sql
CREATE TABLE IF NOT EXISTS fuel_reimbursement (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 10. trips (ทริป)

```sql
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    start_date_time TIMESTAMP NOT NULL,
    end_date_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

### 11. trip_car_driver (รถและคนขับของทริป)

```sql
CREATE TABLE IF NOT EXISTS trip_car_driver (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    CONSTRAINT trip_car_driver_trip_car_driver_key UNIQUE (trip_id, car_id, driver_id)
);
```

## ตาราง Transaction Tables (ตารางธุรกรรม)

### 1. bookings (การจองรถ)

```sql
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    requester_name VARCHAR(255),
    requester_position VARCHAR(255),
    car_id INTEGER,
    supervisor_name VARCHAR(255),
    supervisor_position VARCHAR(255),
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE NOT NULL,
    end_time TIME NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose TEXT,
    distance NUMERIC(10,2),
    passengers INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES department(id),
    trip_type_id INTEGER REFERENCES trip_type(id),
    fuel_reimbursement_id INTEGER REFERENCES fuel_reimbursement(id),
    status_id INTEGER REFERENCES booking_status(id),
    self_drive BOOLEAN NOT NULL DEFAULT FALSE
);
```

## ความสัมพันธ์ระหว่างตาราง (Relationships)

```
users (1) ←→ (N) bookings  [NO CASCADE DELETE]
cars (1) ←→ (N) bookings   [NO CASCADE DELETE]  
car_type (1) ←→ (N) cars
driver_type (1) ←→ (N) drivers
booking_status (1) ←→ (N) bookings
trips (1) ←→ (N) bookings
department (1) ←→ (N) bookings
trip_type (1) ←→ (N) bookings
fuel_reimbursement (1) ←→ (N) bookings
drivers (1) ←→ (N) bookings
```

## ตารางที่มี Cascade Delete

### **drivers → bookings**

- เมื่อลบข้อมูลในตาราง `drivers`
- ข้อมูลการจองที่เกี่ยวข้องใน `bookings` จะถูก set null ที่ `driver_id`
- เนื่องจาก: `driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL`

### **trips → bookings**

- เมื่อลบข้อมูลในตาราง `trips`
- ข้อมูลการจองที่เกี่ยวข้องใน `bookings` จะถูก set null ที่ `trip_id`
- เนื่องจาก: `trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL`

## ตารางที่ไม่มี Cascade Delete

- `users` → `bookings` (ไม่มี foreign key constraint)
- `cars` → `bookings` (ไม่มี foreign key constraint)
- `car_type` → `cars` (มี constraint แต่ไม่มี cascade delete)
- `driver_type` → `drivers` (มี constraint แต่ไม่มี cascade delete)
- `booking_status` → `bookings` (มี constraint แต่ไม่มี cascade delete)
- `department` → `bookings` (มี constraint แต่ไม่มี cascade delete)
- `trip_type` → `bookings` (มี constraint แต่ไม่มี cascade delete)
- `fuel_reimbursement` → `bookings` (มี constraint แต่ไม่มี cascade delete)

## สรุป

- **ลบ user** → **ไม่มีผล** ต่อ bookings (ไม่มี FK constraint)
- **ลบ car** → **ไม่มีผล** ต่อ bookings (ไม่มี FK constraint)
- **ลบ driver** → **bookings.driver_id = NULL**
- **ลบ trip** → **bookings.trip_id = NULL**
- **ลบ master tables อื่นๆ** → **ไม่มีผล** ต่อ bookings (มี FK แต่ไม่ cascade delete)

**คำเตือน:** การลบข้อมูลในตาราง `drivers` หรือ `trips` จะส่งผลให้ `bookings` ที่เกี่ยวข้องมีค่า NULL ในฟิลด์ที่อ้างอิง ควรใช้ความระมัดระวังในการลบข้อมูล

## ข้อมูลเริ่มต้น (Initial Data)

### ประเภทพนักงานขับรถ

```sql
INSERT INTO driver_type (code, driver_type, created_by, updated_by)
VALUES 
    ('01', 'พนักงานขับรถเป็นครั้งคราว', 'system', 'system'),
    ('02', 'พนักงานขับรถยนต์', 'system', 'system')
ON CONFLICT (code) DO UPDATE SET driver_type = EXCLUDED.driver_type;
```

### สถานะการจอง

```sql
INSERT INTO booking_status (code, name, created_by, updated_by)
VALUES 
    ('001', 'รอจัดรถ', 'system', 'system'),
    ('002', 'จัดรถแล้ว', 'system', 'system'),
    ('003', 'เดินทางแล้ว', 'system', 'system'),
    ('004', 'ยกเลิก', 'system', 'system')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name;
```

### ประเภททริป

```sql
INSERT INTO trip_type (name, created_by, updated_by)
VALUES 
    ('ภายในจังหวัด', 'system', 'system'),
    ('ต่างจังหวัด', 'system', 'system')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name;
```

### ค่าเชื้อเพลิง

```sql
INSERT INTO fuel_reimbursement (name, created_by, updated_by)
VALUES 
    ('เงินทดรอง', 'system', 'system'),
    ('เงินสด', 'system', 'system'),
    ('บัตรเติมน้ำมัน', 'system', 'system')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name;
```

## Indexes สำหรับประสิทธิภาพ

```sql
-- Indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_id ON bookings(status_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_department_id ON bookings(department_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_type_id ON bookings(trip_type_id);

-- Indexes for cars table
CREATE INDEX IF NOT EXISTS idx_cars_license_plate ON cars(license_plate);
CREATE INDEX IF NOT EXISTS idx_cars_is_active ON cars(is_active);
CREATE INDEX IF NOT EXISTS idx_cars_car_type_id ON cars(car_type_id);

-- Indexes for drivers table
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_type_code ON drivers(driver_type_code);

-- Indexes for status tables
CREATE INDEX IF NOT EXISTS idx_booking_status_code ON booking_status(code);
CREATE INDEX IF NOT EXISTS idx_department_is_active ON department(is_active);
```

## Trigger สำหรับอัพเดท timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_status_updated_at BEFORE UPDATE ON booking_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_type_updated_at BEFORE UPDATE ON driver_type FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_department_updated_at BEFORE UPDATE ON department FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_type_updated_at BEFORE UPDATE ON trip_type FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_reimbursement_updated_at BEFORE UPDATE ON fuel_reimbursement FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_type_updated_at BEFORE UPDATE ON car_type FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## การใช้งานผ่าน Docker

### ตรวจสอบตารางทั้งหมด

```powershell
docker exec -i postgres psql -U admin -d carbooking -c "\dt"
```

### ตรวจสอบข้อมูลในตาราง master

```powershell
# ตรวจสอบข้อมูลผู้ใช้
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, username, fullname, role FROM users ORDER BY id;"

# ตรวจสอบข้อมูลรถ
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, brand, model, license_plate, is_active FROM cars ORDER BY id;"

# ตรวจสอบประเภทพนักงานขับรถ
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, code, driver_type FROM driver_type ORDER BY code;"

# ตรวจสอบพนักงานขับรถ
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, fullname, driver_type_code, is_active FROM drivers ORDER BY id;"

# ตรวจสอบสถานะการจอง
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, code, name FROM booking_status ORDER BY code;"

# ตรวจสอบแผนก
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, name, is_active FROM department ORDER BY id;"

# ตรวจสอบประเภททริป
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, name FROM trip_type ORDER BY id;"

# ตรวจสอบค่าเชื้อเพลิง
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, name FROM fuel_reimbursement ORDER BY id;"
```

### ตรวจสอบข้อมูลในตาราง transaction

```powershell
# ตรวจสอบการจองทั้งหมด
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, requester_name, car_id, status_id, start_date, start_time, destination FROM bookings ORDER BY created_at DESC LIMIT 10;"
```

## บันทึกการเปลี่ยนแปลง (Change Log)

- **Version 1.0** (2025-01-01): สร้างตารางหลักและตารางธุรกรรมเบื้องต้น
  - Master Tables: users, cars, driver_type, drivers, booking_status
  - Transaction Tables: bookings
  - เพิ่ม indexes และ triggers สำหรับประสิทธิภาพ

- **Version 1.1** (2025-03-18): อัพเดทโครงสร้างให้ตรงกับ production database
  - เพิ่ม Master Tables: department, trip_type, fuel_reimbursement, trips, car_type
  - อัพเดท bookings table: เพิ่มฟิลด์ trip_id, driver_id, department_id, trip_type_id, fuel_reimbursement_id, status_id
  - **เปลี่ยนแปลงสำคัญ**: ลบ foreign key constraint ระหว่าง users→bookings และ cars→bookings
  - คงไว้เฉพาะ ON DELETE SET NULL สำหรับ drivers→bookings และ trips→bookings

- **Version 1.2** (2026-03-18): แยกวันที่และเวลาในตาราง bookings
  - **เปลี่ยนแปลงสำคัญ**: แยกฟิลด์ start_time และ end_time จาก timestamp เป็น:
    - start_date (DATE) + start_time (TIME)
    - end_date (DATE) + end_time (TIME)
  - อัปเดทโครงสร้างตาราง master tables ให้ครบถ้วน
  - เพิ่ม is_active field ใน department table
  - อัปเดต indexes และ triggers ให้ครบถ้วน
