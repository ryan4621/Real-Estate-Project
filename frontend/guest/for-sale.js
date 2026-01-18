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
let searchId = null;
let isSaved = false


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

	await checkIfSearchIsSaved();
});

window.addEventListener('pageshow', (event) => {
    loadProperties();
});

function setupEventListeners() {

	const searchParam = urlParams.get('search');
	const searchInput = document.getElementById("searchInput");
	const defaultSearch = 'Los Angeles, California';

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

	const saveSearchBtn = document.getElementById('save-search-btn')

	if (saveSearchBtn) {
		saveSearchBtn.addEventListener('click', async function() {
			if (isSaved) {
				await removeSavedSearch(searchId);
				this.textContent = "Save Search";
				isSaved = false;
			} else {
				await saveSearch();
			}
		});
	}

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
		document.querySelectorAll('.filter-modal').forEach(modal => {
			modal.classList.remove('active');
		});
	});

	listDisplayMode.addEventListener('click', () => {
		listDisplayMode.classList.add('active');
		mapDisplayMode.classList.remove('active');
		
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'list');
		window.history.replaceState({}, '', newUrl); 
	});

	mapDisplayMode.addEventListener('click', () => {
		mapDisplayMode.classList.add('active');
		listDisplayMode.classList.remove('active');
		
		const newUrl = new URL(window.location);
		newUrl.searchParams.set('display', 'map');
		window.history.replaceState({}, '', newUrl); 
	});

	// Mobile Filter Modal Functionality
    const mobileFilterBtn = document.getElementById('properties-mobile-filter-btn');
    const mobileFilterModal = document.getElementById('properties-mobile-filter-modal');
    const mobileFilterOverlay = document.getElementById('properties-mobile-filter-overlay');
    const mobileFilterClose = document.getElementById('properties-mobile-filter-close');
    const mobileApplyBtn = document.getElementById('properties-mobile-apply-btn');
    const mobileResetBtn = document.getElementById('properties-mobile-reset-btn');

    // Sync filters helper function
    const syncDesktopToMobile = () => {
        document.getElementById('properties-min-price-mobile').value = document.getElementById('properties-min-price').value;
        document.getElementById('properties-max-price-mobile').value = document.getElementById('properties-max-price').value;
        document.getElementById('properties-type-filter-mobile').value = document.getElementById('properties-type-filter').value;
        document.getElementById('properties-min-bed-mobile').value = document.getElementById('properties-min-bed').value;
        document.getElementById('properties-max-bed-mobile').value = document.getElementById('properties-max-bed').value;
        document.getElementById('properties-min-bath-mobile').value = document.getElementById('properties-min-bath').value;
        document.getElementById('properties-max-bath-mobile').value = document.getElementById('properties-max-bath').value;
    };

    const syncMobileToDesktop = () => {
        document.getElementById('properties-min-price').value = document.getElementById('properties-min-price-mobile').value;
        document.getElementById('properties-max-price').value = document.getElementById('properties-max-price-mobile').value;
        document.getElementById('properties-type-filter').value = document.getElementById('properties-type-filter-mobile').value;
        document.getElementById('properties-min-bed').value = document.getElementById('properties-min-bed-mobile').value;
        document.getElementById('properties-max-bed').value = document.getElementById('properties-max-bed-mobile').value;
        document.getElementById('properties-min-bath').value = document.getElementById('properties-min-bath-mobile').value;
        document.getElementById('properties-max-bath').value = document.getElementById('properties-max-bath-mobile').value;
    };

    // Open mobile filter modal
    if (mobileFilterBtn) {
		mobileFilterBtn.addEventListener('click', () => {
			syncDesktopToMobile();
			mobileFilterModal.classList.add('active');
			mobileFilterOverlay.classList.add('active');
			document.body.style.overflow = 'hidden';
			
			// Open all accordions
			accordionButtons.forEach(btn => {
				btn.classList.add('active');
				btn.nextElementSibling.classList.add('active');
			});
		});
	}

    // Close mobile filter modal
    const closeMobileFilter = () => {
        mobileFilterModal.classList.remove('active');
        mobileFilterOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (mobileFilterClose) {
        mobileFilterClose.addEventListener('click', closeMobileFilter);
    }

    if (mobileFilterOverlay) {
        mobileFilterOverlay.addEventListener('click', closeMobileFilter);
    }

    // Apply mobile filters
    if (mobileApplyBtn) {
        mobileApplyBtn.addEventListener('click', () => {
            syncMobileToDesktop();
            currentPage = 1;
            closeMobileFilter();
            loadProperties();
        });
    }

    // Reset mobile filters
    if (mobileResetBtn) {
        mobileResetBtn.addEventListener('click', () => {
            document.getElementById('properties-min-price-mobile').value = 'No min';
            document.getElementById('properties-max-price-mobile').value = 'No max';
            document.getElementById('properties-type-filter-mobile').value = 'Any';
            document.getElementById('properties-min-bed-mobile').value = 'No min';
            document.getElementById('properties-max-bed-mobile').value = 'No max';
            document.getElementById('properties-min-bath-mobile').value = 'No min';
            document.getElementById('properties-max-bath-mobile').value = 'No max';
            
            syncMobileToDesktop();
            resetFilters();
            closeMobileFilter();
        });
    }

    // Accordion functionality
    const accordionButtons = document.querySelectorAll('.properties-mobile-accordion-btn');
    
    accordionButtons.forEach(button => {
		button.addEventListener('click', () => {
			const content = button.nextElementSibling;
			
			// Toggle only the clicked accordion
			button.classList.toggle('active');
			content.classList.toggle('active');
		});
	});

    // Close modal on resize back to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeMobileFilter();
        }
    });
};

async function checkIfSearchIsSaved() {
    try {
        applyFilters();
        
        const authResponse = await fetch('/auth/me', { credentials: 'include' });
        if (!authResponse.ok) return;

        const savedSearchesResponse = await fetch('/api/saved-searches', { 
            credentials: 'include' 
        });
        
        if (!savedSearchesResponse.ok) return;
        
        const savedSearches = await savedSearchesResponse.json();

        // Normalize current filters to match database format
        const normalizedCurrentFilters = {
            search: currentFilters.search || null,
            property_type: currentFilters.type !== 'Any' ? currentFilters.type : null,
            price_min: currentFilters.minPrice !== 'No min' ? currentFilters.minPrice : null,
            price_max: currentFilters.maxPrice !== 'No max' ? currentFilters.maxPrice : null,
            bedrooms_min: currentFilters.minBedrooms !== 'No min' ? currentFilters.minBedrooms : null,
            bedrooms_max: currentFilters.maxBedrooms !== 'No max' ? currentFilters.maxBedrooms : null,
            bathrooms_min: currentFilters.minBathrooms !== 'No min' ? currentFilters.minBathrooms : null,
            bathrooms_max: currentFilters.maxBathrooms !== 'No max' ? currentFilters.maxBathrooms : null
        };

        const matchingSearch = savedSearches.data.find(search => {
            const savedFilters = typeof search.filters === 'string' 
                ? JSON.parse(search.filters) 
                : search.filters;
            
            return JSON.stringify(savedFilters) === JSON.stringify(normalizedCurrentFilters);
        });

        if (matchingSearch) {
            isSaved = true;
            searchId = matchingSearch.id;
            const saveSearchBtn = document.getElementById('save-search-btn');
            if (saveSearchBtn) {
                saveSearchBtn.textContent = "Saved";
            }
        }
        
    } catch (error) {
        console.error('Error checking saved searches:', error);
    }
}

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

		const newUrl = new URL(window.location);
        newUrl.search = params.toString();
        window.history.replaceState({}, '', newUrl);

		const currentPath = window.location.pathname;
        let res;
        
        if (currentPath.includes('sale')) {
            res = await fetch(`${FOR_SALE_API_BASE}/properties/for-sale?${params.toString()}`, {
				credentials: "include",
			});
        } else if (currentPath.includes('rent')) {
            res = await fetch(`${FOR_SALE_API_BASE}/properties/for-rent?${params.toString()}`, {
				credentials: "include",
			});
        }else if (currentPath.includes('sold')) {
            res = await fetch(`${FOR_SALE_API_BASE}/properties/sold?${params.toString()}`, {
				credentials: "include",
			});
        }

        if(!res.ok){
            showToast('Failed to load properties', 'error')
            return
        }

		const data = await res.json();

		// Update results info
        const resultsCount = document.querySelector('.properties-results-count');
        const resultsLocation = document.querySelector('.properties-results-location');
        
        resultsCount.textContent = `${data.meta.total} homes`;
        
        if (currentFilters.search && currentPath.includes('sale')) {
            resultsLocation.textContent = `${currentFilters.search} homes for sale`;
        } else if(currentFilters.search && currentPath.includes('rent')) {
            resultsLocation.textContent = `${currentFilters.search} homes for rent`;
		}else if(currentFilters.search && currentPath.includes('sold')) {
            resultsLocation.textContent = `Sold homes in ${currentFilters.search}`;
		}else if (currentPath.includes('rent')) {
            resultsLocation.textContent = 'Homes for rent';
		}else if (currentPath.includes('sold')) {
            resultsLocation.textContent = 'Sold homes';
		}else {
            resultsLocation.textContent = 'Homes for sale';
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

			if (!propertyImageRes.ok) throw new Error("Failed to fetch images");

            const images = await propertyImageRes.json();

			const sortedImages = images.sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

			const imageUrls = sortedImages.length > 0 
			? sortedImages.map(img => img.image_url)
			: ["/images/properties-backup.jpeg"];

			const primaryImage = imageUrls[0];

			let status;

			if(property.status === 'Sale'){
				status = 'for sale'
			}else if(property.status === 'Rent'){
				status = 'for rent'
			}else{
				status = 'Sold'
			}

            const address = `${property.street_number} ${property.street_name}`;
            const location = `${property.city}, ${property.state} ${property.zip}`;

			const propertyInfo = document.createElement("div");
            propertyInfo.classList.add('property-info')
			propertyInfo.innerHTML = `
				<span class="property-card-broker">Brokered by ${escapeHtml(property.broker || 'N/A')}</span>
				<div class="property-card">
					<div class="property-card-image-wrapper">
						<img src="${primaryImage}" alt="Property-Image" class="property-card-image">
						<span class="property-card-status">${escapeHtml(status)}</span>
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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(Math.round(property.area))}</strong> sqft</span>
						</div>
						<div class="property-card-bottom">
							<div class="property-card-address">${escapeHtml(address)}</div>
							<div class="property-card-location">${escapeHtml(location)}</div>
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
		
					const favRes = await fetch('/api/favorites', { credentials: "include" });
		
					if(!favRes.ok){
						throw new Error('Failed to load favorites')
					}
		
					const favorites = await favRes.json();
		
					const favData = favorites.data

					const isFavorited = favData.some(fav => fav.property_id === property.property_id);
		
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
            document.querySelector('.nav-signup-btn').click();
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
			searchId = result.id;
            isSaved = true;
            
            const saveSearchBtn = document.getElementById('save-search-btn');
            saveSearchBtn.textContent = "Saved";

            showToast('Search saved successfully', 'success');

			window.loadSearchesMini();
        } else {
            showToast('Failed to save search', 'error');
        }

    } catch (error) {
        console.error('Error saving search:', error);
        showToast('Failed to save search', 'error');
    }
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

		isSaved = false;
        searchId = null;
		
		showToast('Search removed successfully', 'success');
        window.loadSearchesMini();

	}catch(error){
		console.error(error)
		showToast('Failed to remove saved search. Please try again later.', 'error')
	}
}

function applyFilters() {
	currentFilters = {
		search: document.getElementById("searchInput").value.trim(),
		type: document.getElementById("properties-type-filter").value,
		minPrice: document.getElementById("properties-min-price").value,
		maxPrice: document.getElementById("properties-max-price").value,
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
		type: "Any",
        minPrice: "No min",
        maxPrice: "No max",
        minBedrooms: "No min",
        maxBedrooms: "No max",
        minBathrooms: "No min",
        maxBathrooms: "No max",
        sort: "newest"
    };

	document.getElementById("searchInput").value = "",
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