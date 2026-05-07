// ============================================
// MediConnect - Main JavaScript
// Common functionality for all pages
// ============================================

const API_BASE = '/api';

// ============================================
// Dynamic Header/Footer Loading
// ============================================
async function loadIncludes() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const res = await fetch('/includes/header.html');
            const html = await res.text();
            headerPlaceholder.innerHTML = html;
            initHeader();
        } catch (e) {
            console.error('Failed to load header:', e);
        }
    }

    // Load footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        try {
            const res = await fetch('/includes/footer.html');
            const html = await res.text();
            footerPlaceholder.innerHTML = html;
        } catch (e) {
            console.error('Failed to load footer:', e);
        }
    }
}

// ============================================
// Header Initialization
// ============================================
function initHeader() {
    // Active nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/index.html')) {
            link.classList.add('active');
        }
    });

    // Login dropdown toggle and dynamic updates
    const loginToggle = document.getElementById('loginToggle');
    const loginDropdown = document.getElementById('loginDropdown');
    const loginMenu = document.getElementById('loginMenu');
    
    if (loginToggle && loginDropdown) {
        if (isLoggedIn()) {
            const role = getUserRole();
            const user = getUser();
            loginToggle.querySelector('span').textContent = user.full_name.split(' ')[0]; // Show first name
            if (loginMenu) {
                // Patients don't have a dashboard yet, so we'll link to Book Appointment or Profile
                const dashboardLink = role === 'patient' ? '/patient/appointment.html' : `/${role}/dashboard.html`;
                const dashboardText = role === 'patient' ? 'Book Appointment' : 'Dashboard';
                
                loginMenu.innerHTML = `
                    <a href="${dashboardLink}" class="dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        ${dashboardText}
                    </a>
                    <a href="#" onclick="logout(); return false;" class="dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Logout
                    </a>
                `;
            }
        }

        loginToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            loginDropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            loginDropdown.classList.remove('open');
        });
    }

    // Dynamic mobile menu updates
    const mobileNavContent = document.querySelector('.mobile-nav-content');
    if (mobileNavContent && isLoggedIn()) {
        const role = getUserRole();
        // Keep the first 4 elements (Home, Book, Check, Divider), replace the rest
        const baseLinks = `
            <a href="/index.html" class="mobile-nav-link" data-page="home">Home</a>
            <a href="/patient/appointment.html" class="mobile-nav-link" data-page="appointment">Book Appointment</a>
            <a href="/patient/check-status.html" class="mobile-nav-link" data-page="check-status">Check Appointment</a>
            <div class="mobile-nav-divider"></div>
        `;
        mobileNavContent.innerHTML = baseLinks + `
            <a href="/${role}/dashboard.html" class="mobile-nav-link">My Dashboard</a>
            <a href="#" onclick="logout(); return false;" class="mobile-nav-link" style="color: var(--error-500);">Logout</a>
        `;
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    if (mobileMenuBtn && mobileNavOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('open');
            mobileNavOverlay.classList.toggle('open');
            document.body.style.overflow = mobileNavOverlay.classList.contains('open') ? 'hidden' : '';
        });
    }

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('mainHeader');
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }
    });
}

// ============================================
// Toast Notification System
// ============================================
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
    }, 4000);
}

// ============================================
// API Helper Functions
// ============================================
async function apiGet(endpoint) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${endpoint}`, { headers });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (error) {
        console.error('API GET Error:', error);
        throw error;
    }
}

async function apiPost(endpoint, body) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

async function apiPut(endpoint, body) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (error) {
        console.error('API PUT Error:', error);
        throw error;
    }
}

async function apiDelete(endpoint) {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (error) {
        console.error('API DELETE Error:', error);
        throw error;
    }
}

// ============================================
// Auth Helper Functions
// ============================================
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function getUserRole() {
    return localStorage.getItem('role') || null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/index.html';
}

function requireAuth(role) {
    if (!isLoggedIn() || getUserRole() !== role) {
        window.location.href = role === 'admin' ? '/admin/login.html' : '/doctor/login.html';
        return false;
    }
    return true;
}

// ============================================
// Utility Functions
// ============================================

// Format date to readable string
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format date for input fields
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

// Get status badge HTML
function getStatusBadge(status) {
    return `<span class="status-badge ${status}">${status}</span>`;
}

// Generate initials from name
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================
// Dashboard Sidebar Toggle (Mobile)
// ============================================
function initDashboardSidebar() {
    const sidebar = document.querySelector('.dashboard-sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar on outside click
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Set active sidebar link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });
}

// ============================================
// Initialize on DOM Load
// ============================================
// ============================================
// Modal & Appointment Details System
// ============================================
function viewDetails(id) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    modal.classList.add('open');
    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

    apiGet(`/appointments/${id}`).then(async data => {
        const apt = data.appointment;
        const role = getUserRole();
        
        let historyHtml = '';
        if (role === 'doctor') {
            try {
                const histData = await apiGet(`/appointments/patient/history?email=${apt.patient_email}&doctor_id=${getUser().id}`);
                const history = histData.history || [];
                if (history.length > 0) {
                    historyHtml = `
                        <div style="margin-top:var(--space-6); border-top:2px solid var(--neutral-100); padding-top:var(--space-6);">
                            <h4 style="font-size:var(--text-sm); text-transform:uppercase; color:var(--primary-700); margin-bottom:var(--space-4);">Past Medical History</h4>
                            <div style="display:flex; flex-direction:column; gap:var(--space-4);">
                                ${history.map(h => `
                                    <div style="background:var(--neutral-50); padding:var(--space-4); border-radius:var(--radius-md); border:1px solid var(--neutral-200);">
                                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                            <span style="font-weight:700; font-size:0.85rem;">${formatDate(h.appointment_date)}</span>
                                            <span style="font-size:0.75rem; color:var(--neutral-500);">Dr. ${h.doctor_name}</span>
                                        </div>
                                        <p style="font-size:0.9rem; color:var(--neutral-800); margin-bottom:8px;"><strong>Diagnosis:</strong> ${h.diagnosis || 'N/A'}</p>
                                        ${h.prescription ? `<p style="font-size:0.85rem; color:var(--neutral-600); font-style:italic;"><strong>Prescription:</strong> ${h.prescription}</p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    historyHtml = `
                        <div style="margin-top:var(--space-6); border-top:2px solid var(--neutral-100); padding-top:var(--space-6);">
                            <h4 style="font-size:var(--text-sm); text-transform:uppercase; color:var(--neutral-400); margin-bottom:var(--space-2);">Past Medical History</h4>
                            <p style="font-size:0.85rem; color:var(--neutral-500);">No past records found for this patient.</p>
                        </div>
                    `;
                }
            } catch (e) {
                console.error('Failed to load history:', e);
            }
        }

        body.innerHTML = `
            <div class="modal-detail-view" style="display:flex; flex-direction:column; gap:var(--space-5);">
                <!-- Header Info -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:var(--space-4); background:var(--primary-50); border-radius:var(--radius-lg); border-left:4px solid var(--primary-600);">
                    <div>
                        <label style="font-size:var(--text-xs); color:var(--primary-700); text-transform:uppercase; letter-spacing:0.05em; font-weight:700; display:block; margin-bottom:4px;">Appointment ID</label>
                        <p style="font-size:1.1rem; font-weight:800; color:var(--primary-900);">${apt.appointment_number}</p>
                    </div>
                    <div style="text-align:right;">
                        <label style="font-size:var(--text-xs); color:var(--neutral-500); display:block; margin-bottom:4px;">Status</label>
                        ${getStatusBadge(apt.status)}
                    </div>
                </div>

                <!-- Grid Info -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-6); padding:0 var(--space-2);">
                    <div>
                        <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Patient Name</label>
                        <p style="font-weight:600; font-size:0.95rem;">${apt.patient_name}</p>
                    </div>
                    <div>
                        <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Contact Phone</label>
                        <p style="font-weight:600; font-size:0.95rem;">${apt.patient_phone}</p>
                    </div>
                    <div style="grid-column: 1 / span 2;">
                        <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Email Address</label>
                        <p style="font-weight:600; font-size:0.95rem;">${apt.patient_email}</p>
                    </div>
                    <div style="padding-top:var(--space-2); border-top:1px solid var(--neutral-100);">
                        <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Apt. Date</label>
                        <p style="font-weight:600; color:var(--primary-700); font-size:0.95rem;">${formatDate(apt.appointment_date)}</p>
                    </div>
                    <div style="padding-top:var(--space-2); border-top:1px solid var(--neutral-100);">
                        <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Time Slot</label>
                        <p style="font-weight:600; color:var(--primary-700); font-size:0.95rem;">${apt.time_slot}</p>
                    </div>
                </div>

                <!-- Patient Notes -->
                <div style="padding-top:var(--space-2);">
                    <label style="font-size:var(--text-xs); color:var(--neutral-400); text-transform:uppercase; font-weight:600; display:block; margin-bottom:8px;">Patient Notes</label>
                    <div style="padding:var(--space-4); background:var(--white); border:1px dashed var(--neutral-200); border-radius:var(--radius-md); font-style:italic; color:var(--neutral-600); font-size:0.9rem;">
                        ${apt.notes || 'No notes provided.'}
                    </div>
                </div>

                <!-- History Section (Doctors only) -->
                ${historyHtml}

                <!-- Actions / Close -->
                <div style="margin-top:var(--space-4); display:flex; justify-content:flex-end; gap:var(--space-3); padding-top:var(--space-4); border-top:1px solid var(--neutral-100);">
                    <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
    }).catch(err => {
        body.innerHTML = `
            <div style="padding:var(--space-10); text-align:center;">
                <div style="color:var(--danger-500); margin-bottom:var(--space-4);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h4 style="margin-bottom:var(--space-2);">Failed to load details</h4>
                <p style="color:var(--neutral-500); font-size:0.9rem;">${err.message}</p>
                <button class="btn btn-primary btn-sm" style="margin-top:var(--space-4);" onclick="closeModal()">Dismiss</button>
            </div>
        `;
    });
}

function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.remove('open');
}

// Global modal click listener
window.addEventListener('click', (event) => {
    const modal = document.getElementById('detailsModal');
    if (event.target == modal) closeModal();
});

document.addEventListener('DOMContentLoaded', () => {
    loadIncludes();
});

