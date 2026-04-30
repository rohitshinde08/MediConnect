-- ============================================
-- MediConnect Database Schema
-- Doctor Appointment Management System
-- ============================================

CREATE DATABASE IF NOT EXISTS mediconnect;
USE mediconnect;

-- ============================================
-- Specializations Table
-- ============================================
CREATE TABLE specializations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Default Specializations
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
-- Doctors Table
-- ============================================

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    specialization_id INT,
    qualification VARCHAR(255),
    experience_years INT DEFAULT 0,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    bio TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE SET NULL
);

-- Default Doctors (password: doctor123)
INSERT INTO doctors (full_name, email, password, phone, specialization_id, qualification, experience_years, consultation_fee, bio) VALUES
('Dr. Emilia Winson', 'emilia@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0101', 1, 'MBBS, MD', 12, 500.00, 'Experienced general physician with over 12 years of practice.'),
('Dr. James Carter', 'james@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0102', 2, 'MBBS, DM Cardiology', 15, 800.00, 'Senior cardiologist specializing in interventional cardiology.'),
('Dr. Sarah Mitchell', 'sarah@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0103', 3, 'MBBS, MD Dermatology', 8, 600.00, 'Dermatologist with expertise in cosmetic and clinical dermatology.'),
('Dr. Robert Lee', 'robert@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0104', 4, 'MBBS, MS Orthopedics', 10, 700.00, 'Orthopedic surgeon with specialization in joint replacement.'),
('Dr. Priya Sharma', 'priya@mediconnect.com', '$2a$10$TjsO1SCwYNw7TlyPeOqwYuXxLGY0ahnEDthPKbdyYblXLGUqPuBdm', '+1 555-0105', 5, 'MBBS, MD Pediatrics', 9, 450.00, 'Pediatrician dedicated to child health and development.');
-- ============================================
-- Admin Table
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

-- ============================================
-- Appointments Table
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE SET NULL
);

-- Sample Appointments
INSERT INTO appointments (id,appointment_number, patient_name, patient_email, patient_phone, doctor_id, specialization_id, appointment_date, time_slot, status) VALUES
(1,'APT-2024-001', 'Samantha Williams', 'samantha@email.com', '+1 555-1001', 1, 1, '2026-04-14', '09:00 AM', 'approved'),
(2,'APT-2024-002', 'John Smith', 'john@email.com', '+1 555-1002', 2, 2, '2026-04-15', '10:00 AM', 'pending'),
(3,'APT-2024-003', 'Emily Davis', 'emily@email.com', '+1 555-1003', 3, 3, '2026-04-16', '02:00 PM', 'cancelled');
