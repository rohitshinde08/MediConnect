-- ============================================
-- MediConnect Unified Database Schema
-- Optimized for Real-World Healthcare Workflow
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS mediconnect;
CREATE DATABASE mediconnect;
USE mediconnect;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 1. Specializations Table
-- ============================================
CREATE TABLE specializations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO specializations (name, description) VALUES
('General Physician', 'Provides general health care, diagnosis, and treatment for common illnesses.'),
('Cardiologist', 'Specializes in diagnosing and treating heart-related diseases and conditions.'),
('Dermatologist', 'Treats skin, hair, and nail conditions.'),
('Orthopedic', 'Treats bone, joint, and muscle-related problems.'),
('Pediatrician', 'Provides medical care for infants, children, and adolescents.'),
('Neurologist', 'Deals with disorders of the brain, spinal cord, and nervous system.'),
('Ophthalmology', 'Eye care specialists'),
('ENT', 'Treats ear, nose, and throat-related issues.'),
('Gynecologist', 'Focuses on women’s reproductive health and related conditions.'),
('Dentist', 'Provides care for teeth, gums, and overall oral health.'),
('Psychiatrist', 'Diagnoses and treats mental health disorders.');

-- ============================================
-- 2. Doctors Table
-- ============================================
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    specialization_id INT,
    license_number VARCHAR(100),
    qualification VARCHAR(255),
    experience_years INT DEFAULT 0,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    bio TEXT,
    document_path VARCHAR(255),
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE SET NULL
);

-- Default Doctors (password: doctor123)
INSERT INTO doctors (full_name, email, password, phone, specialization_id, license_number, qualification, experience_years, consultation_fee, bio, verification_status) VALUES
('Dr. Emilia Winson', 'emilia@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0101', 1, 'LIC-1001', 'MBBS, MD', 12, 500.00, 'Experienced general physician with over 12 years of practice.', 'approved'),
('Dr. James Carter', 'james@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0102', 2, 'LIC-1002', 'MBBS, DM Cardiology', 15, 800.00, 'Senior cardiologist specializing in interventional cardiology.', 'approved'),
('Dr. Sarah Mitchell', 'sarah@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0103', 3, 'LIC-1003', 'MBBS, MD Dermatology', 8, 600.00, 'Dermatologist with expertise in cosmetic and clinical dermatology.', 'approved');

-- ============================================
-- 3. Admin Table
-- ============================================
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default Admin (password: admin123)
INSERT INTO admins (full_name, email, password, role) VALUES 
('System Admin', 'admin@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', 'superadmin');

-- ============================================
-- 4. Doctor Availability Table
-- ============================================
CREATE TABLE doctor_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT DEFAULT 30, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_availability (doctor_id, available_date)
);


-- 6. Appointments Table
-- ============================================
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_number VARCHAR(20) NOT NULL UNIQUE,
    patient_name VARCHAR(150) NOT NULL,
    patient_email VARCHAR(150) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    doctor_id INT,
    specialization_id INT,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved', 'cancelled', 'completed') DEFAULT 'pending',
    notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE SET NULL
);

-- Sample Appointments
INSERT INTO appointments (appointment_number, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, status) VALUES
('APT-2024-001', 'Samantha Williams', 'samantha@email.com', '+1 555-1001', 1, 1, '2026-05-10', '09:00 AM', 'approved'),
('APT-2024-002', 'John Smith', 'john@email.com', '+1 555-1002', 2, 2, '2026-05-12', '10:00 AM', 'pending');
