// admin-open-houses.js

const API_BASE = `/admin`;

let currentPage = 1;
const limit = 20;
let currentFilters = {
    search: "",
    status: "all",
    rsvp: "all"
};

let formState = null;
let openHouseId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadOpenHouses();
});

// Setup event listeners
function setupEventListeners() {
    // Search
    const debouncedSearch = debounce(() => loadOpenHouses(1), 400);
    document.getElementById("open-house-search-input").addEventListener("input", debouncedSearch);

    // Filters
    document.getElementById("open-house-status-filter").addEventListener("change", () => loadOpenHouses(1));
    document.getElementById("open-house-rsvp-filter").addEventListener("change", () => loadOpenHouses(1));

    // Add open house button
    document.getElementById('open-house-add-btn').addEventListener('click', openAddModal);

    // Refresh button
    document.getElementById('open-house-refresh-btn').addEventListener('click', () => loadOpenHouses(currentPage));

    // Modal controls
    setupModalListeners();

    // Form submission
    document.getElementById("open-house-form").addEventListener("submit", handleFormSubmit);
}

// Setup modal event listeners
function setupModalListeners() {
    const modal = document.getElementById('open-house-form-modal');
    const modalOverlay = document.getElementById('open-house-modal-overlay');
    const closeModalBtn = document.getElementById('open-house-modal-close-btn');
    const cancelBtn = document.getElementById('open-house-cancel-btn');

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Prevent closing when clicking inside modal
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Load open houses
async function loadOpenHouses(page) {
    try {
        applyFilters();

        if (page) currentPage = page;

        const params = new URLSearchParams({
            page: currentPage,
            limit: limit,
        });

        if (currentFilters.search) params.append("q", currentFilters.search);
        if (currentFilters.status && currentFilters.status !== "all") params.append("status", currentFilters.status);
        if (currentFilters.rsvp && currentFilters.rsvp !== "all") params.append("requires_rsvp", currentFilters.rsvp);

        const res = await fetch(`${API_BASE}/open-houses?${params.toString()}`, {
            credentials: "include",
        });

        const data = await res.json();

        if (data.data.length === 0) {
            document.getElementById("open-house-empty-alert").style.display = "block";
            document.querySelector(".open-house-table").style.display = "none";
            return;
        }

        document.getElementById("open-house-empty-alert").style.display = "none";
        document.querySelector(".open-house-table").style.display = "table";

        const tbody = document.getElementById("open-house-table-body");
        tbody.innerHTML = "";

        data.data.forEach(openHouse => {
            const row = document.createElement("tr");
            
            // Format dates
            const startDate = new Date(openHouse.start_datetime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const endDate = new Date(openHouse.end_datetime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Status badge
            let statusClass = 'open-house-status-scheduled';
            if (openHouse.status === 'Completed') statusClass = 'open-house-status-completed';
            if (openHouse.status === 'Cancelled') statusClass = 'open-house-status-cancelled';

            // RSVP badge
            const rsvpBadge = openHouse.requires_rsvp 
                ? '<span class="open-house-rsvp-badge open-house-rsvp-yes"><i class="fas fa-check"></i> Yes</span>'
                : '<span class="open-house-rsvp-badge open-house-rsvp-no"><i class="fas fa-times"></i> No</span>';

            // Attendees info
            const attendeesInfo = openHouse.max_attendees 
                ? `<div class="open-house-attendees-info">
                    <i class="fas fa-users"></i>
                    ${openHouse.current_attendees || 0} / ${openHouse.max_attendees}
                   </div>`
                : `<div class="open-house-attendees-info">
                    <i class="fas fa-users"></i>
                    ${openHouse.current_attendees || 0}
                   </div>`;

            row.innerHTML = `
                <td>${escapeHtml(openHouse.id)}</td>
                <td>${escapeHtml(openHouse.property_id)}</td>
                <td>${escapeHtml(startDate)}</td>
                <td>${escapeHtml(endDate)}</td>
                <td>${escapeHtml(openHouse.host_name || 'N/A')}</td>
                <td>
                    <div style="font-size: 12px;">
                        ${openHouse.host_phone ? `<div><i class="fas fa-phone"></i> ${escapeHtml(openHouse.host_phone)}</div>` : ''}
                        ${openHouse.host_email ? `<div><i class="fas fa-envelope"></i> ${escapeHtml(openHouse.host_email)}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="open-house-status-badge ${statusClass}">
                        ${escapeHtml(openHouse.status)}
                    </span>
                </td>
                <td>${attendeesInfo}</td>
                <td>${rsvpBadge}</td>
                <td>
                    <div class="open-house-action-btns">
                        <button class="open-house-action-btn open-house-edit-btn" data-id="${openHouse.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="open-house-action-btn open-house-delete-btn" data-id="${openHouse.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        attachTableEventListeners();
        renderPagination(data.meta);

    } catch (error) {
        console.error("Error loading open houses:", error);
        showToast("Failed to load open houses", "error");
    }
}

// Attach event listeners to table buttons
function attachTableEventListeners() {
    document.querySelectorAll('.open-house-edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            openHouseId = e.currentTarget.dataset.id;
            await openEditModal(openHouseId);
        });
    });

    document.querySelectorAll('.open-house-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            openHouseId = e.currentTarget.dataset.id;
            await deleteOpenHouse(openHouseId);
        });
    });
}

// Apply filters from UI
function applyFilters() {
    currentFilters = {
        search: document.getElementById("open-house-search-input").value.trim(),
        status: document.getElementById("open-house-status-filter").value,
        rsvp: document.getElementById("open-house-rsvp-filter").value,
    };
}

// Render pagination controls
function renderPagination(meta) {
    const container = document.getElementById("open-house-pagination");
    if (!container) return;

    container.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "‹";
    prevBtn.disabled = meta.page === 1;
    prevBtn.addEventListener("click", () => loadOpenHouses(meta.page - 1));
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= meta.totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i === meta.page;
        btn.addEventListener("click", () => loadOpenHouses(i));
        container.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "›";
    nextBtn.disabled = meta.page === meta.totalPages;
    nextBtn.addEventListener("click", () => loadOpenHouses(meta.page + 1));
    container.appendChild(nextBtn);
}

// Open add modal
function openAddModal() {
    formState = 'add';
    openHouseId = null;
    const modal = document.getElementById('open-house-form-modal');
    const modalOverlay = document.getElementById('open-house-modal-overlay');
    const modalTitle = document.getElementById('open-house-modal-title');
    const submitBtn = document.getElementById('open-house-submit-btn');

    modal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalTitle.textContent = 'Schedule Open House';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Open House';
    
    document.getElementById('open-house-form').reset();
    document.getElementById('open-house-property-id').disabled = false;
}

// Open edit modal
async function openEditModal(id) {
    formState = 'edit';
    openHouseId = id;
    const modal = document.getElementById('open-house-form-modal');
    const modalOverlay = document.getElementById('open-house-modal-overlay');
    const modalTitle = document.getElementById('open-house-modal-title');
    const submitBtn = document.getElementById('open-house-submit-btn');

    modal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalTitle.textContent = 'Edit Open House';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Open House';
    
    await loadOpenHouseData(id);
}

// Close modal
function closeModal() {
    const modal = document.getElementById('open-house-form-modal');
    const modalOverlay = document.getElementById('open-house-modal-overlay');

    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('open-house-form').reset();
}

// Load open house data for editing
async function loadOpenHouseData(id) {
    try {
        const response = await fetch(`${API_BASE}/open-houses/${id}`, {
            credentials: "include"
        });

        if (!response.ok) {
            showToast("Open house not found", "error");
            return;
        }

        const openHouse = await response.json();

        // Populate form fields
        document.getElementById('open-house-property-id').value = openHouse.property_id;
        document.getElementById('open-house-property-id').disabled = true;
        
        // Format datetime for input
        const formatDateTime = (dateStr) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        document.getElementById('open-house-start-datetime').value = formatDateTime(openHouse.start_datetime);
        document.getElementById('open-house-end-datetime').value = formatDateTime(openHouse.end_datetime);
        document.getElementById('open-house-host-name').value = openHouse.host_name || '';
        document.getElementById('open-house-host-phone').value = openHouse.host_phone || '';
        document.getElementById('open-house-host-email').value = openHouse.host_email || '';
        document.getElementById('open-house-description').value = openHouse.description || '';
        document.getElementById('open-house-status').value = openHouse.status;
        document.getElementById('open-house-max-attendees').value = openHouse.max_attendees || '';
        document.getElementById('open-house-requires-rsvp').checked = openHouse.requires_rsvp === 1 || openHouse.requires_rsvp === true;

    } catch (error) {
        console.error("Error loading open house:", error);
        showToast("Failed to load open house data", "error");
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const propertyId = document.getElementById('open-house-property-id').value.trim();
    const startDatetime = document.getElementById('open-house-start-datetime').value;
    const endDatetime = document.getElementById('open-house-end-datetime').value;
    
    if (!propertyId || !startDatetime || !endDatetime) {
        showToast("Please fill in all required fields", "error");
        return;
    }

    // Validate date range
    if (new Date(startDatetime) >= new Date(endDatetime)) {
        showToast("End date must be after start date", "error");
        return;
    }

    const openHouseData = {
        property_id: propertyId,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        host_name: document.getElementById('open-house-host-name').value.trim() || null,
        host_phone: document.getElementById('open-house-host-phone').value.trim() || null,
        host_email: document.getElementById('open-house-host-email').value.trim() || null,
        description: document.getElementById('open-house-description').value.trim() || null,
        status: document.getElementById('open-house-status').value,
        max_attendees: document.getElementById('open-house-max-attendees').value || null,
        requires_rsvp: document.getElementById('open-house-requires-rsvp').checked
    };

    const submitBtn = document.getElementById('open-house-submit-btn');
    submitBtn.disabled = true;

    try {
        let url, method;

        if (formState === "edit") {
            url = `${API_BASE}/open-houses/${openHouseId}`;
            method = "PUT";
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        } else {
            url = `${API_BASE}/open-houses`;
            method = "POST";
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: "include",
            body: JSON.stringify(openHouseData),
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');
            closeModal();
            loadOpenHouses(currentPage);
        } else {
            showToast(result.message || "Operation failed", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Operation failed", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = formState === "edit" 
            ? '<i class="fas fa-save"></i> Update Open House' 
            : '<i class="fas fa-save"></i> Save Open House';
    }
}

// Delete open house
async function deleteOpenHouse(id) {
    const confirmed = await showConfirmation(
        "Are you sure you want to delete this open house?",
        "Delete Open House",
        {
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
        }
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/open-houses/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "x-csrf-token": window.getCsrfToken(),
            },
        });

        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message, "success");
            loadOpenHouses(currentPage);
        } else {
            showToast(data.message || "Delete failed", "error");
        }
    } catch (err) {
        console.error("Error deleting open house:", err);
        showToast("Delete failed", "error");
    }
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
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
}