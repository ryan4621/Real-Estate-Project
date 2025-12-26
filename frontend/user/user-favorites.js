const API_BASE = `/api`;

let currentPage = 1;
const limit = 40;
let currentFilters = {
	status: "all",
    sort: "newest"
};

let paginationDisabled = false;

const listDisplayMode = document.getElementById('list-display-mode');
const mapDisplayMode = document.getElementById('map-display-mode');

const urlParams = new URLSearchParams(window.location.search);
const displayMode = urlParams.get('display') || 'list';

if (displayMode === 'map') {
    mapDisplayMode.classList.add('active');
    listDisplayMode.classList.remove('active');
} else {
    listDisplayMode.classList.add('active');
    mapDisplayMode.classList.remove('active');
}

// document.addEventListener('DOMContentLoaded', async () => {
// 	setupEventListeners();
// 	loadFavorites();
// });

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        loadFavorites();
    } else {
        setupEventListeners();
	    loadFavorites();
        loadSavedSearches()
    }
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById("properties-status-filter").addEventListener("change", () => loadFavorites(1));
    document.getElementById('filters-reset-btn').addEventListener('click', resetFilters)

    document.getElementById("properties-sort-select").addEventListener("change", () => loadFavorites(1));
    document.getElementById('favorites-back-btn').addEventListener('click', () => {
        history.back();
    });

    const tabs = document.querySelectorAll('.saved-tab');
    const contents = document.querySelectorAll('.saved-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const newUrl = new URL(window.location);
            newUrl.searchParams.set('tab', targetTab);
            window.history.replaceState({}, '', newUrl);

            contents.forEach(content => content.classList.remove('active'));
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    listDisplayMode.addEventListener('click', () => {
		listDisplayMode.classList.add('active');
		mapDisplayMode.classList.remove('active');
		
		// Update URL without reload
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'list');
		// window.history.pushState({}, '', newUrl);
	});

	mapDisplayMode.addEventListener('click', () => {
		mapDisplayMode.classList.add('active');
		listDisplayMode.classList.remove('active');
		
		// Update URL without reload
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'map');
		// window.history.pushState({}, '', newUrl);
	});

    // Check URL for active tab on page load
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    if (activeTab) {
        document.querySelectorAll('.saved-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.saved-tab-content').forEach(c => c.classList.remove('active'));
        
        const tabToActivate = document.querySelector(`[data-tab="${activeTab}"]`);
        const contentToActivate = document.querySelector(`[data-content="${activeTab}"]`);
        
        if (tabToActivate && contentToActivate) {
            tabToActivate.classList.add('active');
            contentToActivate.classList.add('active');
        }
    }
};

async function loadFavorites(page = currentPage){

    try{
        applyFilters();

        currentPage = page;

		const params = new URLSearchParams({
			page: page || currentPage,
			limit: limit,
		});

		if (currentFilters.status && currentFilters.status !== "all") params.append("status", currentFilters.status);
        if (currentFilters.sort) params.append("sort", currentFilters.sort);

        const favRes = await fetch(`/api/favorites?${params.toString()}`, { credentials: "include" });

		if(!favRes.ok){
			throw new Error('Failed to load favorites')
		}

		const favorites = await favRes.json();

        const emptyAlert = document.querySelector(".empty-alert")
        const propertiespagination = document.querySelector(".properties-pagination")
    
        const propertiesGrid = document.getElementById("propertiesGrid");
        propertiesGrid.innerHTML = "";
    
        if (favorites.data.length === 0) {
            emptyAlert.style.display = "block";
            propertiespagination.style.display = "none"
            return;
        };
    
        for (const property of favorites.data) {
            const propertyImageRes = await fetch(`/public/properties/${property.property_id}/images`, {
                credentials: "include",
            });
    
            const images = await propertyImageRes.json();
    
            // Sort images: primary first, then by ID or created_at
			const sortedImages = images.sort((a, b) => {
				if (a.is_primary) return -1;
				if (b.is_primary) return 1;
				return 0;
			});

			// Get all image URLs from sorted array
			const imageUrls = sortedImages.length > 0 
			? sortedImages.map(img => img.image_url)
			: ["/images/properties-backup.jpeg"];

			const primaryImage = imageUrls[0];

            const addedAt = new Date(property.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const propertyInfo = document.createElement("div");

            propertyInfo.classList.add('property-info')
            propertyInfo.innerHTML = `
                <span class="property-card-broker">Saved ${escapeHtml(addedAt)}</span>
                <div class="property-card">
                    <div class="property-card-image-wrapper">
                        <img src="${primaryImage}" alt="Property-Image" class="property-card-image">
                        <span class="property-card-status">${escapeHtml(property.status)}</span>
                        <button class="image-nav-btn image-nav-prev">
							<i class="bi bi-chevron-left"></i>
						</button>
						<button class="image-nav-btn image-nav-next">
							<i class="bi bi-chevron-right"></i>
						</button>
						<div class="image-counter">
							<span class="current-image">1</span>/<span class="total-images">${escapeHtml(imageUrls.length)}</span>
						</div>
                        <button class="property-card-favorite">
                            <i class="bi bi-heart-fill heart-filled" style="display: block";></i>
                        </button>
                    </div>
                    <div class="property-card-content">
                        <div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
                        <div class="property-card-details">
                            <span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
                            <span class="property-card-separator">|</span>
                            <span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
                            <span class="property-card-separator">|</span>
                            <span class="property-card-detail"><strong>${Math.round(property.area).toLocaleString()}</strong> sqft</span>
                        </div>
                        <div class="property-card-address">${escapeHtml(property.address)}</div>
                        <div class="property-card-location">${escapeHtml(property.location)}</div>
                        <div class="property-card-agent">
                            <span class="property-card-agent-label">Listed by:</span>
                            <span class="property-card-agent-name">${escapeHtml(property.agent_name)}</span>
                        </div>
                    </div>
                </div>                
            `;

            const statusElement = propertyInfo.querySelector('.property-card-status');
            getPropertyStatus(property.status, statusElement);

            // Image navigation setup
            let currentImageIndex = 0;
            const propertyImage = propertyInfo.querySelector('.property-card-image');
            const currentImageSpan = propertyInfo.querySelector('.current-image');
            const prevBtn = propertyInfo.querySelector('.image-nav-prev');
            const nextBtn = propertyInfo.querySelector('.image-nav-next');

            if (imageUrls.length <= 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentImageIndex = (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
                propertyImage.src = imageUrls[currentImageIndex];
                currentImageSpan.textContent = currentImageIndex + 1;
            });

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
                propertyImage.src = imageUrls[currentImageIndex];
                currentImageSpan.textContent = currentImageIndex + 1;
            });
    
            propertyInfo.addEventListener('click', () => {
                window.location.href = `/frontend/guest/property.html?id=${property.property_id}`
            });
    
            propertiesGrid.appendChild(propertyInfo);

			const propertyFavoriteIcon = propertyInfo.querySelector('.property-card-favorite');

            propertyFavoriteIcon.addEventListener('click', async (e) => {
				e.stopPropagation();

                const confirmed = await showConfirmation(
                    "Deleting this listing from Saved listings also removes it from all collections.",
                    "Delete Saved Listing",
                    {
                        confirmText: "Delete",
                        cancelText: "Cancel",
                    }
                );
            
                if(!confirmed){
                    return
                };
            
                await removeFavorites(property.property_id);
                loadFavorites(currentPage);
			});

            paginationDisabled = favorites.meta.totalPages <= 1;
		    renderPagination(favorites.meta);

        };
    }catch (error) {
		console.error("Error loading properties:", error);
        const errorAlert = document.querySelector(".error-alert")
        const propertiespagination = document.querySelector(".properties-pagination")
        errorAlert.style.display = "block"
        propertiespagination.style.display = "none"
	}
}

// Apply filters from UI
function applyFilters() {
	currentFilters = {
		status: document.getElementById("properties-status-filter").value,
        sort: document.getElementById("properties-sort-select").value
	};
}

// Reset filters
function resetFilters() {
	currentPage = 1;
	currentFilters = {
        status: "all",
        sort: "newest"
    };

    document.getElementById("properties-status-filter").value = "all",
    document.getElementById("properties-sort-select").value = "newest"; 

	loadFavorites();
}

async function loadSavedSearches(){
    try{   
        const savedRes = await fetch('/api/saved-searches', { credentials: "include" });

		if(!savedRes.ok){
			throw new Error('Failed to load saved searches')
		}

		const savedSearches = await savedRes.json();

        const emptyAlert = document.getElementById("ss-empty-alert")
    
        const ssGrid = document.getElementById("saved-searches-grid");
        ssGrid.innerHTML = "";
    
        if (savedSearches.data.length === 0) {
            emptyAlert.style.display = "block";
            return;
        };

        console.log(savedSearches.data)
    
        for (const search of savedSearches.data) {

            const addedAt = new Date(search.added_at).toLocaleString();
            const filters = JSON.parse(search.filters)
            const ssInfo = document.createElement("div");

            ssInfo.classList.add('ss-info')
            ssInfo.innerHTML = `
                <div class="ss-card">
                    <div class="ss-card-header">
                        <span class="ss-card-timestamp">${escapeHtml(addedAt)}</span>
                        <button class="ss-delete-btn">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    
                    <div class="ss-card-content">
                        <div class="ss-details">
                            <span class="ss-title">${escapeHtml(filters.search)} - ${escapeHtml(search.category)}</span>
                            <span class="ss-filters">Property type: ${escapeHtml(filters.property_type || 'All Types')}</span>
                            <span class="ss-filters">Price: ${filters.price_min ? '$' + Math.round(filters.price_min).toLocaleString() : 'No min'} - ${filters.price_max ? '$' + Math.round(filters.price_max).toLocaleString() : 'No max'}</span>
                            <span class="ss-filters">Bedrooms: ${escapeHtml(filters.bedrooms_min || 'No min')} - ${escapeHtml(filters.bedrooms_max || 'No max')}</span>
                            <span class="ss-filters">Bathrooms: ${escapeHtml(filters.bathrooms_min || 'No min')} - ${escapeHtml(filters.bathrooms_max || 'No max')}</span>
                        </div>
                    </div>
                    
                    <div class="ss-card-footer">
                        <button class="ss-search-btn">Run Search</button>
                        <div class="ss-alerts-toggle">
                            <label class="ss-toggle-switch">
                                <input type="checkbox" class="alert-toggle" data-search-id="${search.id}" ${search.alerts_enabled ? 'checked' : ''}>
                                <span class="ss-toggle-slider"></span>
                            </label>
                            <span class="ss-alerts-text">Alerts</span>
                        </div>
                    </div>
                </div>           
            `;
    
            ssGrid.appendChild(ssInfo);

            const ssSearchBtn = ssInfo.querySelector('.ss-search-btn');
            ssSearchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                runSavedSearch(search);
            });

            const alertToggle = ssInfo.querySelector('.alert-toggle');
            alertToggle.addEventListener('change', async (e) => {
                e.stopPropagation()
                ssAlert(alertToggle);
            });

			const ssDeleteBtn = ssInfo.querySelector('.ss-delete-btn');

            ssDeleteBtn.addEventListener('click', async (e) => {
				e.stopPropagation();

                const confirmed = await showConfirmation(
                    "Are you sure?",
                    "Delete Saved Search",
                    {
                        confirmText: "Delete",
                        cancelText: "Cancel",
                    }
                );
            
                if(!confirmed){
                    return
                };
            
                await removeSavedSearch(search.id);
                loadSavedSearches();
			});

        };

    }catch (error) {
		console.error("Error loading properties:", error);
        const errorAlert = document.getElementById(".ss-error-alert")
        errorAlert.style.display = "block"
	}
}

function runSavedSearch(search) {
    const filters = JSON.parse(search.filters);
    const category = search.category.toLowerCase();
    
    // Build URL with all filters
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.property_type) params.append('type', filters.property_type);
    if (filters.price_min) params.append('min_price', filters.price_min);
    if (filters.price_max) params.append('max_price', filters.price_max);
    if (filters.bedrooms_min) params.append('min_bed', filters.bedrooms_min);
    if (filters.bedrooms_max) params.append('max_bed', filters.bedrooms_max);
    if (filters.bathrooms_min) params.append('min_bath', filters.bathrooms_min);
    if (filters.bathrooms_max) params.append('max_bath', filters.bathrooms_max);
    
    // Determine target page based on listing_mode
    let targetPage;
    if (category === 'rent') {
        targetPage = '/frontend/guest/for-rent.html';
    } else if (category === 'sold') {
        targetPage = '/frontend/guest/sold.html';
    } else {
        targetPage = '/frontend/guest/for-sale.html';
    }
    
    window.location.href = `${targetPage}?${params.toString()}`;
}

async function removeSavedSearch(searchId){
	try {
		const response = await fetch(`/api/saved-searches/${searchId}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken()
			}
		})

		if(!response.ok){
			throw new Error('Failed to remove saved search')
		}

        window.loadSearchesMini();

	}catch(error){
		console.error(error)
		showToast('Failed to remove saved search. Please try again later.', 'error')
	}
}

async function ssAlert(alertToggle){
    const searchId = alertToggle.dataset.searchId;
    const isEnabled = alertToggle.checked;
    
    try {
        const response = await fetch(`/api/saved-searches/${searchId}/alerts`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': window.getCsrfToken()
            },
            credentials: 'include',
            body: JSON.stringify({ alerts: isEnabled })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update alerts');
        }
        
        showToast(`Alerts ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        console.error('Error updating alerts:', error);
        showToast('Failed to update alerts', 'error');
        // Revert toggle
        alertToggle.checked = !isEnabled;
    }
}

// Render pagination controls
function renderPagination(meta) {
	// Previous button
	const prevBtn = document.getElementById("previous-btn");
	prevBtn.disabled = meta.page === 1;
	prevBtn.addEventListener("click", () => loadFavorites(meta.page - 1));

	// Page numbers
	const paginationButtons = document.querySelectorAll(".properties-pagination-btn");

    paginationButtons.forEach((btn) => {
		const page = parseInt(btn.textContent);
		const clone = btn.cloneNode(true);

		// Disable all except the active one if paginationDisabled is true
		if (paginationDisabled && page !== meta.page) {
			clone.disabled = true;
		} else {
			clone.disabled = false;
		}

		// Set active class
		if (page === meta.page) {
			clone.classList.add("active");
		} else {
			clone.classList.remove("active");
		}

		clone.addEventListener("click", () => loadFavorites(page));

		btn.replaceWith(clone);
	});

	// Next button
	const nextBtn = document.getElementById("next-btn");
	nextBtn.disabled = meta.page === meta.totalPages;
	nextBtn.addEventListener("click", () => loadFavorites(meta.page + 1));
}