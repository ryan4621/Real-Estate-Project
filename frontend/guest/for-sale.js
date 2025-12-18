const FOR_SALE_API_BASE = `/public`;

let currentPage = 1;
const limit = 40;
let currentFilters = {
	search: "",
	minPrice: "No min",
	maxPrice: "No max",
	type: "Any",
	minBedrooms: "No min",
	maxBedrooms: "No max",
	minBathrooms: "No min",
	maxBathrooms: "No max",
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

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
	setupEventListeners();
	
	// Get all filter params from URL
	const urlParams = new URLSearchParams(window.location.search);

	if (urlParams.get('search')) {
		document.getElementById("searchInput").value = urlParams.get('search');
	}
	if (urlParams.get('type')) {
		document.getElementById("properties-type-filter").value = urlParams.get('type');
	}
	if (urlParams.get('min_price')) {
		document.getElementById("properties-min-price").value = urlParams.get('min_price');
	}
	if (urlParams.get('max_price')) {
		document.getElementById("properties-max-price").value = urlParams.get('max_price');
	}
	if (urlParams.get('min_bed')) {
		document.getElementById("properties-min-bed").value = urlParams.get('min_bed');
	}
	if (urlParams.get('max_bed')) {
		document.getElementById("properties-max-bed").value = urlParams.get('max_bed');
	}
	if (urlParams.get('min_bath')) {
		document.getElementById("properties-min-bath").value = urlParams.get('min_bath');
	}
	if (urlParams.get('max_bath')) {
		document.getElementById("properties-max-bath").value = urlParams.get('max_bath');
	}
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
		loadProperties();
    } else {
		loadProperties();
    }
});

function setupEventListeners() {

	const searchParam = urlParams.get('search');
	const defaultSearch = 'Los Angeles, California';
	const searchInput = document.getElementById("searchInput");

	if (searchParam) {
		searchInput.value = searchParam;
		currentFilters.search = searchParam;
	}else {
		searchInput.value = defaultSearch;
		currentFilters.search = defaultSearch;
	}

	const debouncedSearch = debounce(() => loadProperties(1), 400);
	document.getElementById("searchInput").addEventListener("input", debouncedSearch);

    document.getElementById('filters-reset-btn').addEventListener('click', resetFilters)

	document.getElementById('save-search-btn').addEventListener('click', saveSearch)

    document.getElementById("properties-sort-select").addEventListener("change", () => {
        currentPage = 1;
        loadProperties();
    });

	document.querySelectorAll('.apply-filters-btn').forEach(btn => btn.addEventListener('click', () => {
        currentPage = 1;
		priceFilterModal.classList.remove('active')
		propertyTypeFilterModal.classList.remove('active')
		roomsFilterModal.classList.remove('active')
        loadProperties();
    }))

	const priceFilterModal = document.querySelector('.price-filter-modal')
	const propertyTypeFilterModal = document.querySelector('.property-type-filter-modal')
	const roomsFilterModal = document.querySelector('.rooms-filter-modal')

	document.getElementById('price-filter-btn').addEventListener('click', (e) => {
		e.stopPropagation();
		priceFilterModal.classList.toggle('active')
		propertyTypeFilterModal.classList.remove('active')
		roomsFilterModal.classList.remove('active')
	})

	document.getElementById('property-type-filter-btn').addEventListener('click', (e) => {
		e.stopPropagation();
		propertyTypeFilterModal.classList.toggle('active')
		priceFilterModal.classList.remove('active')
		roomsFilterModal.classList.remove('active')
	})

	document.getElementById('rooms-filter-btn').addEventListener('click', (e) => {
		e.stopPropagation();
		roomsFilterModal.classList.toggle('active')
		priceFilterModal.classList.remove('active')
		propertyTypeFilterModal.classList.remove('active')
	})

	document.querySelectorAll('.filter-modal').forEach(modal => {
		modal.addEventListener('click', (e) => {
			e.stopPropagation();
		});
	});

	document.addEventListener('click', () => {
		console.log("Outside clicked!")
		document.querySelectorAll('.filter-modal').forEach(modal => {
			modal.classList.remove('active');
		});
	});

	listDisplayMode.addEventListener('click', () => {
		listDisplayMode.classList.add('active');
		mapDisplayMode.classList.remove('active');
		
		// Update URL without reload
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'list');
		window.history.replaceState({}, '', newUrl); 
	});

	mapDisplayMode.addEventListener('click', () => {
		mapDisplayMode.classList.add('active');
		listDisplayMode.classList.remove('active');
		
		// Update URL without reload
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'map');
		window.history.replaceState({}, '', newUrl); 
	});
};

async function loadProperties(page) {
	try {
		applyFilters();

		const params = new URLSearchParams({
			page: page || currentPage,
			limit: limit,
		});

		if (currentFilters.search) params.append("q", currentFilters.search);
		if (currentFilters.minPrice && currentFilters.minPrice !== "No min") params.append("min_price", currentFilters.minPrice);
		if (currentFilters.maxPrice && currentFilters.maxPrice !== "No max") params.append("max_price", currentFilters.maxPrice);
		if (currentFilters.type && currentFilters.type !== "Any") params.append("property_type", currentFilters.type);
		if (currentFilters.minBedrooms && currentFilters.minBedrooms !== "No min") params.append("min_bedrooms", currentFilters.minBedrooms);
		if (currentFilters.maxBedrooms && currentFilters.maxBedrooms !== "No max") params.append("max_bedrooms", currentFilters.maxBedrooms);
		if (currentFilters.minBathrooms && currentFilters.minBathrooms !== "No min") params.append("min_bathrooms", currentFilters.minBathrooms);
		if (currentFilters.maxBathrooms && currentFilters.maxBathrooms !== "No max") params.append("max_bathrooms", currentFilters.maxBathrooms);
        if (currentFilters.sort) params.append("sort", currentFilters.sort);

		const res = await fetch(`${FOR_SALE_API_BASE}/properties?${params.toString()}`, {
			credentials: "include",
		});

        if(!res.ok){
            showToast('Failed to load properties', 'error')
            return
        }

		const data = await res.json();

		// Update results info
        const resultsCount = document.querySelector('.properties-results-count');
        const resultsLocation = document.querySelector('.properties-results-location');
        
        resultsCount.textContent = `${data.meta.total} Properties Found`;
        
        if (currentFilters.search) {
            resultsLocation.textContent = `in ${currentFilters.search}`;
        } else {
            resultsLocation.textContent = '';
        }

		const emptyAlert = document.querySelector(".empty-alert")
        const propertiespagination = document.querySelector(".properties-pagination")
		
		const propertiesGrid = document.getElementById("propertiesGrid");
		propertiesGrid.innerHTML = "";

        if (data.data.length === 0) {
            emptyAlert.style.display = "block";
            propertiespagination.style.display = "none"
            return;
        }else {
			emptyAlert.style.display = "none";
            propertiespagination.style.display = "flex"
		}

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${FOR_SALE_API_BASE}/properties/${property.property_id}/images`, {
                credentials: "include",
            });

            const images = await propertyImageRes.json();

			const sortedImages = images.sort((a, b) => {
				if (a.is_primary) return -1;
				if (b.is_primary) return 1;
				return 0;
			});

			const imageUrls = sortedImages.length > 0 
			? sortedImages.map(img => img.image_url)
			: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600"];

			const primaryImage = imageUrls[0];

            const address = `${property.street_number} ${property.street_name}`;
            const location = `${property.city}, ${property.state} ${property.zip}`;

			const propertyInfo = document.createElement("div");
            propertyInfo.classList.add('property-info')
			propertyInfo.innerHTML = `
				<span class="property-card-broker">Brokered by ${escapeHtml(property.broker || 'N/A')}</span>
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
						<button class="property-card-favorite" id="property-card-favorite">
							<i class="bi bi-heart heart-empty"></i>
							<i class="bi bi-heart-fill heart-filled"></i>
						</button>
                	</div>
					<div class="property-card-content">
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
						</div>
						<div class="property-card-address">${escapeHtml(address)}</div>
						<div class="property-card-location">${escapeHtml(location)}</div>
						<div class="property-card-agent">
							<span class="property-card-agent-label">Listed by:</span>
							<span class="property-card-agent-name">${escapeHtml(property.agent_name)}</span>
						</div>
					</div>
				</div>                
			`;

            const statusElement = propertyInfo.querySelector('.property-card-status');
            getPropertyStatus(property.status, statusElement);

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

			const heartEmpty = propertyInfo.querySelector('.heart-empty');
			const heartFilled = propertyInfo.querySelector('.heart-filled');
			const propertyFavoriteIcon = propertyInfo.querySelector('.property-card-favorite');

			try {
		
				const response = await fetch('/auth/me', {
					credentials: 'include'
				});
		
				if (response.ok) {
					// const user = await response.json();
		
					const favRes = await fetch('/api/favorites', { credentials: "include" });
		
					if(!favRes.ok){
						throw new Error('Failed to load favorites')
					}
		
					const favorites = await favRes.json();
		
					const favData = favorites.data

					const isFavorited = favData.some(fav => fav.property_id === property.property_id);
		
					// console.log(favData)
		
					if (isFavorited) {
						heartEmpty.style.display = 'none';
						heartFilled.style.display = 'block';
					} else {
						heartFilled.style.display = 'none';
						heartEmpty.style.display = 'block';
					}
		
					propertyFavoriteIcon.addEventListener('click', (e) => {
						e.stopPropagation();
		
						const isEmptyVisible = heartEmpty.style.display !== 'none';
		
						if(isEmptyVisible){
							heartEmpty.style.display = 'none';
							heartFilled.style.display = 'block';
							addToFavorites({ ...property, primaryImage, address, location });
						}else {
							heartFilled.style.display = 'none'
							heartEmpty.style.display = 'block'
							removeFavorites(property.property_id)
						}
					});
				}else {
					heartFilled.style.display = 'none';
					heartEmpty.style.display = 'block';

					propertyFavoriteIcon.addEventListener('click', (e) => {
						e.stopPropagation();
						document.querySelector('.nav-signup-btn').click();
						return
					})
				}
				
			}catch(error){
				console.error("Error loading favorites:", error)
			}
		};

        paginationDisabled = data.meta.totalPages <= 1;
		renderPagination(data.meta);

	} catch (error) {
		console.error(error);
		const errorAlert = document.querySelector(".error-alert")
        const propertiespagination = document.querySelector(".properties-pagination")
        errorAlert.style.display = "block"
        propertiespagination.style.display = "none"
	}
}

async function saveSearch(){
    try {
        // Check if user is authenticated
        const authResponse = await fetch('/auth/me', {
            credentials: 'include'
        });

        if (!authResponse.ok) {
            // showToast('Please login to save searches', 'error');
            document.querySelector('.nav-signup-btn')?.click();
            return;
        }

        // Collect current filters
        const filters = {
            search: document.getElementById("searchInput").value.trim() || null,
            property_type: document.getElementById("properties-type-filter").value !== "Any" 
                ? document.getElementById("properties-type-filter").value 
                : null,
            price_min: document.getElementById("properties-min-price").value !== "No min"
                ? document.getElementById("properties-min-price").value
                : null,
            price_max: document.getElementById("properties-max-price").value !== "No max"
                ? document.getElementById("properties-max-price").value
                : null,
            bedrooms_min: document.getElementById("properties-min-bed").value !== "No min"
                ? document.getElementById("properties-min-bed").value
                : null,
            bedrooms_max: document.getElementById("properties-max-bed").value !== "No max"
                ? document.getElementById("properties-max-bed").value
                : null,
            bathrooms_min: document.getElementById("properties-min-bath").value !== "No min"
                ? document.getElementById("properties-min-bath").value
                : null,
            bathrooms_max: document.getElementById("properties-max-bath").value !== "No max"
                ? document.getElementById("properties-max-bath").value
                : null
        };

        // Determine category based on current page URL
        const currentPath = window.location.pathname;
        let category = 'Homes For Sale';
        
        if (currentPath.includes('rent')) {
            category = 'Homes For Rent';
        } else if (currentPath.includes('sold')) {
            category = 'Sold Homes';
        }

        const response = await fetch('/api/saved-searches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': window.getCsrfToken()
            },
            credentials: 'include',
            body: JSON.stringify({
                category,
                filters
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Search saved successfully', 'success');
			window.loadSearchesMini();
        } else {
            showToast(result.message || 'Failed to save search', 'error');
        }

    } catch (error) {
        console.error('Error saving search:', error);
        showToast('Failed to save search', 'error');
    }
}

function applyFilters() {
	currentFilters = {
		search: document.getElementById("searchInput").value.trim(),
		minPrice: document.getElementById("properties-min-price").value,
		maxPrice: document.getElementById("properties-max-price").value,
		type: document.getElementById("properties-type-filter").value,
		minBedrooms: document.getElementById("properties-min-bed").value,
		maxBedrooms: document.getElementById("properties-max-bed").value,
		minBathrooms: document.getElementById("properties-min-bath").value,
		maxBathrooms: document.getElementById("properties-max-bath").value,
        sort: document.getElementById("properties-sort-select").value
	};
}

function resetFilters() {
	currentPage = 1;
	currentFilters = {
        search: "",
        minPrice: "No min",
        maxPrice: "No max",
        type: "Any",
        minBedrooms: "No min",
        maxBedrooms: "No max",
        minBathrooms: "No min",
        maxBathrooms: "No max",
        sort: "newest"
    };

	search: document.getElementById("searchInput").value = "",
	document.getElementById("properties-min-price").value = "No min",
    document.getElementById("properties-max-price").value = "No max",
    document.getElementById("properties-type-filter").value = "Any",
    document.getElementById("properties-min-bed").value = "No min",
    document.getElementById("properties-max-bed").value = "No max",
    document.getElementById("properties-min-bath").value = "No min",
    document.getElementById("properties-max-bath").value = "No max",
    document.getElementById("properties-sort-select").value = "newest"; 

	loadProperties();
}

function renderPagination(meta) {
	// Previous button
	const prevBtn = document.getElementById("previous-btn");
	prevBtn.disabled = meta.page === 1;
	prevBtn.addEventListener("click", () => loadProperties(meta.page - 1));

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

		clone.addEventListener("click", () => loadProperties(page));

		btn.replaceWith(clone);
	});

	// Next button
	const nextBtn = document.getElementById("next-btn");
	nextBtn.disabled = meta.page === meta.totalPages;
	nextBtn.addEventListener("click", () => loadProperties(meta.page + 1));
}