// admin-amenities.js

const API_BASE = `/admin`;

let currentPage = 1;
const limit = 20;
let currentFilters = {
    search: "",
};

let formState = null;
let amenityId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadAmenities();
});

// Setup event listeners
function setupEventListeners() {
    // Search
    const debouncedSearch = debounce(() => loadAmenities(1), 400);
    document.getElementById("searchInput").addEventListener("input", debouncedSearch);

    // Add amenities button
    document.getElementById('add-amenity-btn').addEventListener('click', openAddModal);

    // Modal controls
    setupModalListeners();

    // Form submission
    document.getElementById("amenities-form").addEventListener("submit", handleFormSubmit);

    // Search amenities in form
    document.getElementById("amenity-search").addEventListener("input", filterAmenities);
}

// Setup modal event listeners
function setupModalListeners() {
    const amenitiesModal = document.getElementById('amenities-modal');
    const modalOverlay = document.getElementById('amenities-modal-overlay');
    const closeModalBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Prevent closing when clicking inside modal
    amenitiesModal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Load amenities
async function loadAmenities(page) {
    try {
        applyFilters();

        if (page) currentPage = page;

        const params = new URLSearchParams({
            page: currentPage,
            limit: limit,
        });

        if (currentFilters.search) params.append("q", currentFilters.search);

        const res = await fetch(`${API_BASE}/amenities?${params.toString()}`, {
            credentials: "include",
        });

        const data = await res.json();

        if (data.data.length === 0) {
            document.getElementById("empty-alert").style.display = "block";
            document.querySelector(".amenities-table").style.display = "none";
            return;
        }

        document.getElementById("empty-alert").style.display = "none";
        document.querySelector(".amenities-table").style.display = "table";

        const tbody = document.getElementById("amenities-table-body");
        tbody.innerHTML = "";

        data.data.forEach(amenity => {
            const row = document.createElement("tr");
            
            // Get all true amenities
            const amenitiesList = getAmenitiesList(amenity);
            const displayAmenities = amenitiesList.slice(0, 5);
            const remainingCount = amenitiesList.length - 5;

            row.innerHTML = `
                <td>${escapeHtml(amenity.id)}</td>
                <td>${escapeHtml(amenity.property_id)}</td>
                <td>
                    <div class="amenities-tags">
                        ${displayAmenities.map(a => `<span class="amenity-tag">${escapeHtml(a)}</span>`).join('')}
                        ${remainingCount > 0 ? `<span class="amenity-tag">+${remainingCount} more</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn edit-amenity-btn" data-id="${amenity.id}" data-property-id="${amenity.property_id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="delete-btn delete-amenity-btn" data-id="${amenity.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        attachTableEventListeners();
        renderPagination(data.meta);

    } catch (error) {
        console.error("Error loading amenities:", error);
        showToast("Failed to load amenities", "error");
    }
}

// Get list of amenities from amenity object
function getAmenitiesList(amenity) {
    const amenitiesMap = {
        swimming_pool: 'Swimming Pool',
        elevator: 'Elevator',
        high_ceiling: 'High Ceiling',
        hardwood_floors: 'Hardwood Floors',
        game_room: 'Game Room',
        gourmet_kitchen: 'Gourmet Kitchen',
        ensuite: 'Ensuite',
        water_view: 'Water View',
        city_view: 'City View',
        pets_allowed: 'Pets Allowed',
        guest_house: 'Guest House',
        single_story: 'Single Story',
        security_features: 'Security Features',
        water_front: 'Water Front',
        gym: 'Gym',
        community_gym: 'Community Gym',
        library: 'Library',
        fitness_centre: 'Fitness Centre',
        club_house: 'Club House',
        garage: 'Garage',
        recreational_amenities: 'Recreational Amenities',
        tennis_court: 'Tennis Court',
        fireplace: 'Fireplace',
        multi_stories: 'Multi Stories',
        courtyard_style: 'Courtyard Style',
        rv_parking: 'RV Parking'
    };

    const list = [];
    for (const [key, label] of Object.entries(amenitiesMap)) {
        if (amenity[key]) {
            list.push(label);
        }
    }
    return list;
}

// Attach event listeners to table buttons
function attachTableEventListeners() {
    document.querySelectorAll('.edit-amenity-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            amenityId = e.currentTarget.dataset.id;
            const propertyId = e.currentTarget.dataset.propertyId;
            await openEditModal(amenityId, propertyId);
        });
    });

    document.querySelectorAll('.delete-amenity-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            amenityId = e.currentTarget.dataset.id;
            await deleteAmenity(amenityId);
        });
    });
}

// Apply filters from UI
function applyFilters() {
    currentFilters = {
        search: document.getElementById("searchInput").value.trim(),
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
    prevBtn.addEventListener("click", () => loadAmenities(meta.page - 1));
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= meta.totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i === meta.page;
        btn.addEventListener("click", () => loadAmenities(i));
        container.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "›";
    nextBtn.disabled = meta.page === meta.totalPages;
    nextBtn.addEventListener("click", () => loadAmenities(meta.page + 1));
    container.appendChild(nextBtn);
}

// Open add amenities modal
function openAddModal() {
    formState = 'add';
    amenityId = null;
    const amenitiesModal = document.getElementById('amenities-modal');
    const modalOverlay = document.getElementById('amenities-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const submitBtn = document.querySelector('.submit-btn');

    amenitiesModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalTitle.textContent = 'Add Property Amenities';
    submitBtn.textContent = 'Save Amenities';
    
    document.getElementById('amenities-form').reset();
    document.getElementById('property-id-input').disabled = false;
}

// Open edit amenities modal
async function openEditModal(id, propertyId) {
    formState = 'edit';
    amenityId = id;
    const amenitiesModal = document.getElementById('amenities-modal');
    const modalOverlay = document.getElementById('amenities-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const submitBtn = document.querySelector('.submit-btn');

    amenitiesModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalTitle.textContent = 'Edit Property Amenities';
    submitBtn.textContent = 'Update Amenities';
    
    await loadAmenityData(id, propertyId);
}

// Close modal
function closeModal() {
    const amenitiesModal = document.getElementById('amenities-modal');
    const modalOverlay = document.getElementById('amenities-modal-overlay');

    amenitiesModal.classList.remove('active');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('amenities-form').reset();
}

// Load amenity data for editing
async function loadAmenityData(id, propertyId) {
    try {
        const response = await fetch(`${API_BASE}/amenities/${id}`, {
            credentials: "include"
        });

        if (!response.ok) {
            showToast("Amenity not found", "error");
            return;
        }

        const amenity = await response.json();

        // Populate property ID
        document.getElementById('property-id-input').value = propertyId;
        document.getElementById('property-id-input').disabled = true;

        // Check all amenities that are true
        const checkboxes = document.querySelectorAll('.amenities-grid input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const amenityName = checkbox.name;
            checkbox.checked = amenity[amenityName] === 1 || amenity[amenityName] === true;
        });

    } catch (error) {
        console.error("Error loading amenity:", error);
        showToast("Failed to load amenity data", "error");
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const propertyId = document.getElementById('property-id-input').value.trim();
    
    if (!propertyId) {
        showToast("Please enter a property ID", "error");
        return;
    }

    // Collect all checked amenities
    const checkboxes = document.querySelectorAll('.amenities-grid input[type="checkbox"]');
    const amenitiesData = { property_id: propertyId };
    
    checkboxes.forEach(checkbox => {
        amenitiesData[checkbox.name] = checkbox.checked;
    });

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;

    try {
        let url, method;

        if (formState === "edit") {
            url = `${API_BASE}/amenities/${amenityId}`;
            method = "PUT";
            submitBtn.textContent = "Updating...";
        } else {
            url = `${API_BASE}/amenities`;
            method = "POST";
            submitBtn.textContent = "Saving...";
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: "include",
            body: JSON.stringify(amenitiesData),
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');
            closeModal();
            loadAmenities(currentPage);
        } else {
            showToast(result.message || "Operation failed", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Operation failed", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = formState === "edit" ? "Update Amenities" : "Save Amenities";
    }
}

// Delete amenity
async function deleteAmenity(id) {
    const confirmed = await showConfirmation(
        "Are you sure you want to delete these amenities?",
        "Delete Amenities",
        {
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
        }
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/amenities/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "x-csrf-token": window.getCsrfToken(),
            },
        });

        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message, "success");
            loadAmenities(currentPage);
        } else {
            showToast(data.message || "Delete failed", "error");
        }
    } catch (err) {
        console.error("Error deleting amenity:", err);
        showToast("Delete failed", "error");
    }
}

// Filter amenities in form
function filterAmenities() {
    const searchTerm = document.getElementById('amenity-search').value.toLowerCase();
    const checkboxes = document.querySelectorAll('.amenity-checkbox');

    checkboxes.forEach(checkbox => {
        const label = checkbox.querySelector('.amenity-label').textContent.toLowerCase();
        if (label.includes(searchTerm)) {
            checkbox.style.display = 'flex';
        } else {
            checkbox.style.display = 'none';
        }
    });
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