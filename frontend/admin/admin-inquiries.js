// admin-inquiries.js

const API_BASE = '/admin';

let currentPage = 1;
const limit = 20;
let currentFilters = {
    search: "",
    inquiryStatus: "all",
    requestTour: "all",
};

let inquiryId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadInquiries();
});

// Setup event listeners
function setupEventListeners() {
    // Search and filters
    const debouncedSearch = debounce(() => loadInquiries(1), 400);
    document.getElementById("searchInput").addEventListener("input", debouncedSearch);
    document.getElementById("inquiry-status-filter").addEventListener("change", () => loadInquiries(1));
    document.getElementById("request-tour-filter").addEventListener("change", () => loadInquiries(1));

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => location.reload());

    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', () => exportData('csv'));
    document.getElementById('exportPdf').addEventListener('click', () => exportData('pdf'));
}

// Load inquiries
async function loadInquiries(page) {
    try {
        applyFilters();

        if (page) currentPage = page;

        const params = new URLSearchParams({
            page: currentPage,
            limit: limit,
        });

        if (currentFilters.search) params.append("q", currentFilters.search);
        if (currentFilters.inquiryStatus && currentFilters.inquiryStatus !== "all") params.append("status", currentFilters.inquiryStatus);
        if (currentFilters.requestTour && currentFilters.requestTour !== "all") params.append("request_tour", currentFilters.requestTour);

        const res = await fetch(`${API_BASE}/inquiries?${params.toString()}`, {
            credentials: "include",
        });

        const data = await res.json();

        if (data.data.length === 0) {
            document.getElementById("empty-alert").style.display = "block";
            document.getElementById("inquiries-table").style.display = "none";
            return;
        }

        document.getElementById("empty-alert").style.display = "none";
        document.getElementById("inquiries-table").style.display = "block";

        const tbody = document.getElementById("inquiries-table-body");
        tbody.innerHTML = "";

        data.data.forEach(inquiry => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHtml(inquiry.id)}</td>
                <td>${escapeHtml(inquiry.property_id)}</td>
                <td>${escapeHtml(inquiry.user_id)}</td>
                <td>${escapeHtml(inquiry.name)}</td>
                <td>${escapeHtml(inquiry.email)}</td>
                <td>${escapeHtml(inquiry.phone)}</td>
                <td>${escapeHtml(inquiry.message)}</td>
                <td>${escapeHtml(inquiry.request_tour)}</td>
                <td>${escapeHtml(inquiry.status)}</td>
                <td>${new Date(inquiry.created_at).toLocaleString()}</td>
                <td>${new Date(inquiry.updated_at).toLocaleString()}</td>
                <td>
                    <div class="table-action-btns">
                        <button class="table-action-btn status change-status-btn" data-id="${inquiry.id}">
                            <i class="fa-solid fa-tag"></i>Status
                        </button>
                        <button class="table-action-btn view view-property-btn" data-id="${inquiry.property_id}">
                            <i class="fas fa-plus"></i>View
                        </button>
                        <button class="table-action-btn delete delete-inquiry-btn" data-id="${inquiry.id}">
                            <i class="fas fa-trash"></i>Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
            // inquiryId = inquiry.id
        });

        attachTableEventListeners();
        renderPagination(data.meta);

    } catch (error) {
        console.error("Error loading inquiries:", error);
    }
}

function attachTableEventListeners() {
    document.querySelectorAll('.change-status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            inquiryId = e.target.closest('button').dataset.id;
            showStatusModal(inquiryId);
        });
    });

    document.querySelectorAll('.view-property-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            propertyId = e.target.closest('button').dataset.id;
            console.log(propertyId)
            window.location.href = `/frontend/admin/admin-properties.html?search=${propertyId}`;
        });
    });

    document.querySelectorAll('.delete-inquiry-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            inquiryId = e.currentTarget.dataset.id;
            await deleteInquiry(inquiryId);
        });
    });
}

// Apply filters from UI
function applyFilters() {
    currentFilters = {
        search: document.getElementById("searchInput").value.trim(),
        inquiryStatus: document.getElementById("inquiry-status-filter").value,
        requestTour: document.getElementById("request-tour-filter").value,
    };
}

// Render pagination controls
function renderPagination(meta) {
    const container = document.getElementById("pagination");
    if (!container) return;

    container.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "‹";
    prevBtn.disabled = meta.page === 1;
    prevBtn.addEventListener("click", () => loadInquiries(meta.page - 1));
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= meta.totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i === meta.page;
        btn.addEventListener("click", () => loadInquiries(i));
        container.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "›";
    nextBtn.disabled = meta.page === meta.totalPages;
    nextBtn.addEventListener("click", () => loadInquiries(meta.page + 1));
    container.appendChild(nextBtn);
}

// STATUS MODAL SECTION

// Create confirmation modal
function statusConfirmationModal(inquiryId) {
    const inquiryModal = document.createElement('div');
    inquiryModal.className = 'inquiry-modal';
    inquiryModal.id = 'inquiry-modal';

    inquiryModal.innerHTML = `
        <div class="inquiry-modal-content" id="inquiry-modal-content">
            <div class="status-modal-header">
                <h5 class="status-modal-title">Change inquiry status</h5>
                <button class="status-modal-close" id="statusModalClose">&times;</button>
            </div>
            <div class="status-modal-body">
                Change inquiry status to:
            </div>
            <select class="inquiry-status-select" id="inquiry-status-select">
                <option value="new">New</option>
                <option value="pending">Pending</option>
                <option value="handled">Handled</option>
            </select>
            <div class="status-modal-footer">
                <button class="status-btn status-cancel" id="statusCancelBtn">Cancel</button>
                <button class="status-btn status-confirm" id="statusOkBtn">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(inquiryModal);
    attachModalEventListeners(inquiryId);
}

// Show status modal
function showStatusModal(inquiryId) {
    const existingModal = document.getElementById('inquiry-modal');
    if (existingModal) {
        existingModal.remove();
    }

    statusConfirmationModal(inquiryId);
    const inquiryModal = document.getElementById('inquiry-modal');
    const inquiryOverlay = document.getElementById('inquiry-modal-overlay');

    inquiryModal.classList.add('show');
    inquiryOverlay.style.display = "block";
    document.body.style.overflow = 'hidden';
}

// Close status modal
function closeStatusModal() {
    const inquiryModal = document.getElementById('inquiry-modal');
    const inquiryOverlay = document.getElementById('inquiry-modal-overlay');

    if (inquiryModal) {
        inquiryModal.classList.remove('show');
        inquiryModal.remove();
    }
    if (inquiryOverlay) {
        inquiryOverlay.style.display = "none";
    }
    document.body.style.overflow = '';
}

// Attach modal event listeners
function attachModalEventListeners(inquiryId) {
    // Prevent clicks on modal content from closing
    document.getElementById('inquiry-modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close on modal background click
    document.getElementById('inquiry-modal').addEventListener('click', () => {
        closeStatusModal();
    });

    // Close on overlay click
    document.getElementById('inquiry-modal-overlay').addEventListener('click', () => {
        closeStatusModal();
    });

    // Close button
    document.getElementById('statusModalClose').addEventListener('click', () => {
        closeStatusModal();
    });

    // Cancel button
    document.getElementById('statusCancelBtn').addEventListener('click', () => {
        closeStatusModal();
    });

    // Confirm button
    document.getElementById('statusOkBtn').addEventListener('click', () => {
        updateInquiryStatus(inquiryId);
    });
}

// Update inquiry status
async function updateInquiryStatus(inquiryId) {
    const status = document.getElementById('inquiry-status-select').value;

    try {
        const response = await fetch(`${API_BASE}/inquiries/${inquiryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ status })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Error updating inquiry status");
        }

        showToast("Inquiry status updated successfully", "success");
        closeStatusModal();
        await loadInquiries(currentPage);

    } catch (error) {
        console.error("Error updating inquiry status:", error);
        showToast("Failed to update inquiry status", "error");
    }
}

// Delete inquiry
async function deleteInquiry(inquiryId) {

    const confirmed = await showConfirmation(
        "Are you sure you want to delete this inquiry?",
        "Delete inquiry",
        {
            confirmText: "Continue",
            cancelText: "Cancel",
            danger: true,
        }
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/inquiries/${inquiryId}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "x-csrf-token": window.getCsrfToken(),
            },
        });

        const data = await res.json();
        showToast(data.message, "success");
        await loadInquiries(currentPage);
    } catch (err) {
        console.error("Error deleting inquiry:", err);
        showToast("Failed to delete inquiry", "error");
    }
}

// Export data
function exportData(format) {
    const search = document.getElementById("searchInput").value.trim();
    const inquiryStatus = document.getElementById("inquiry-status-filter").value;
    const requestTour = document.getElementById("request-tour-filter").value;

    const params = new URLSearchParams({ format });

    if (search) params.append("q", search);
    if (inquiryStatus && inquiryStatus !== "all") params.append("status", inquiryStatus);
    if (requestTour && requestTour !== "all") params.append("request_tour", requestTour);

    window.location.href = `/${API_BASE}/inquiries/export?${params.toString()}`;
}

// Helper functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
}