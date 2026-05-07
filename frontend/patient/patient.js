// ============================================
// Patient Module JavaScript
// Handles appointment booking form logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initAppointmentForm();
});

// ============================================
// Initialize Form
// ============================================
async function initAppointmentForm() {
    const specSelect = document.getElementById('specialization');
    const doctorSelect = document.getElementById('doctor');
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('timeSlot');
    const form = document.getElementById('appointmentForm');

    if (!specSelect || !form) return;

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.min = today;
    }

    // Load specializations
    await loadSpecializations();

    // Autofill for logged-in patients
    if (isLoggedIn() && getUserRole() === 'patient') {
        const user = getUser();
        const nameInput = document.getElementById('patientName');
        const emailInput = document.getElementById('patientEmail');
        const phoneInput = document.getElementById('patientPhone');

        if (nameInput) { nameInput.value = user.full_name; nameInput.readOnly = true; }
        if (emailInput) { emailInput.value = user.email; emailInput.readOnly = true; }
        if (phoneInput) { phoneInput.value = user.phone || ''; phoneInput.readOnly = true; }
    }



    // When specialization changes, load doctors
    specSelect.addEventListener('change', async () => {
        const specId = specSelect.value;
        doctorSelect.innerHTML = '<option value="">Select doctor</option>';
        dateInput.disabled = true;
        timeSelect.innerHTML = '<option value="">Select doctor first</option>';
        timeSelect.disabled = true;

        if (specId) {
            await loadDoctorsBySpecialization(specId);
        } else {
            doctorSelect.disabled = true;
        }
    });

    // When doctor changes, enable date
    doctorSelect.addEventListener('change', () => {
        if (doctorSelect.value) {
            dateInput.disabled = false;
            timeSelect.innerHTML = '<option value="">Select date</option>';
        } else {
            dateInput.disabled = true;
            timeSelect.disabled = true;
        }
    });

    // When date changes, load slots
    dateInput.addEventListener('change', async () => {
        const doctorId = doctorSelect.value;
        const date = dateInput.value;

        if (doctorId && date) {
            await loadAvailableSlots(doctorId, date);
        }
    });

    // Handle form submission
    form.addEventListener('submit', handleAppointmentSubmit);
}

// ============================================
// Load Specializations
// ============================================
async function loadSpecializations() {
    const specSelect = document.getElementById('specialization');
    
    try {
        const data = await apiGet('/specializations');
        if (data.specializations) {
            specSelect.innerHTML = '<option value="">Select specialization</option>';
            data.specializations.forEach(spec => {
                specSelect.innerHTML += `<option value="${spec.id}">${spec.name}</option>`;
            });
        }
    } catch (error) {
        showToast('Failed to load specializations', 'error');
    }
}

// ============================================
// Load Doctors by Specialization
// ============================================
async function loadDoctorsBySpecialization(specId) {
    const doctorSelect = document.getElementById('doctor');
    
    try {
        const data = await apiGet(`/doctors?specialization_id=${specId}&status=active`);
        doctorSelect.innerHTML = '<option value="">Select doctor</option>';
        
        if (data.doctors && data.doctors.length > 0) {
            data.doctors.forEach(doc => {
                doctorSelect.innerHTML += `<option value="${doc.id}">${doc.full_name} - ${doc.qualification || ''}</option>`;
            });
            doctorSelect.disabled = false;
        } else {
            doctorSelect.innerHTML = '<option value="">No doctors available</option>';
            doctorSelect.disabled = true;
        }
    } catch (error) {
        showToast('Failed to load doctors', 'error');
    }
}

// ============================================
// Load Available Slots
// ============================================
async function loadAvailableSlots(doctorId, date) {
    const timeSelect = document.getElementById('timeSlot');
    const statusMsg = document.getElementById('slotStatus');
    
    timeSelect.innerHTML = '<option value="">Loading slots...</option>';
    timeSelect.disabled = true;
    statusMsg.textContent = '';

    try {
        const data = await apiGet(`/doctors/${doctorId}/slots?date=${date}`);
        timeSelect.innerHTML = '<option value="">Select time</option>';
        
        if (data.slots && data.slots.length > 0) {
            data.slots.forEach(slot => {
                timeSelect.innerHTML += `<option value="${slot}">${slot}</option>`;
            });
            timeSelect.disabled = false;
            statusMsg.textContent = `${data.slots.length} slots available`;
            statusMsg.style.color = 'var(--success-600)';
        } else {
            timeSelect.innerHTML = '<option value="">No slots available</option>';
            statusMsg.textContent = 'Doctor is not available on this date.';
            statusMsg.style.color = 'var(--error-600)';
        }
    } catch (error) {
        showToast('Failed to load slots', 'error');
        timeSelect.innerHTML = '<option value="">Error loading slots</option>';
    }
}

// ============================================
// Handle Form Submission
// ============================================
async function handleAppointmentSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitAppointmentBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Booking...';

    const formData = {
        patient_name: document.getElementById('patientName').value.trim(),
        patient_email: document.getElementById('patientEmail').value.trim(),
        patient_phone: document.getElementById('patientPhone').value.trim(),
        specialization_id: parseInt(document.getElementById('specialization').value),
        doctor_id: parseInt(document.getElementById('doctor').value),
        appointment_date: document.getElementById('appointmentDate').value,
        time_slot: document.getElementById('timeSlot').value,
        notes: document.getElementById('notes').value.trim()
    };

    // Link to patient account if logged in
    if (isLoggedIn() && getUserRole() === 'patient') {
        formData.patient_id = getUser().id;
    }

    try {
        const data = await apiPost('/appointments', formData);

        // Show success message
        document.getElementById('appointmentFormContainer').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');
        document.getElementById('appointmentNumber').textContent = data.appointment.appointment_number;

        showToast('Appointment booked successfully!', 'success');

    } catch (error) {
        showToast(error.message || 'Failed to book appointment', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Book Appointment
        `;
    }
}

// ============================================
// Reset Form (for "Book Another")
// ============================================
function resetForm() {
    window.location.reload(); // Simplest way to reset everything
}

