//script.js

const HOME_API_BASE = '/public'

document.addEventListener('DOMContentLoaded', async () => {
    setUpHomeEventListeners();
    loadFeatured();
    loadLatest();
});

function setUpHomeEventListeners() {
	const searchWrapper = document.querySelector('.hero-search-wrapper');
	const heroSection = document.querySelector('.hero-section');

	window.addEventListener('scroll', () => {
		const heroBottom = heroSection.getBoundingClientRect().bottom;
		
		if (heroBottom <= 80) { // Adjust for navbar height
			searchWrapper.classList.add('sticky');
		} else {
			searchWrapper.classList.remove('sticky');
		}
	});

	const heroSearchInput = document.querySelector('.hero-search-input');
	const defaultValue = 'Los Angeles, CA';

	document.querySelector('.hero-clear-btn').addEventListener('click', () => {
		heroSearchInput.value = '';
		heroSearchInput.focus();
	});

	heroSearchInput.addEventListener('blur', () => {
		if (heroSearchInput.value.trim() === '') {
			heroSearchInput.value = defaultValue;
		}
	});

	const heroSearchBtn = document.querySelector('.hero-search-btn');

	heroSearchBtn.addEventListener('click', () => {
		const searchValue = heroSearchInput.value.trim();
		
		if (searchValue) {
			window.location.href = `/frontend/guest/for-sale.html?search=${encodeURIComponent(searchValue)}`;
		} else {
			window.location.href = `/frontend/guest/for-sale.html`;
		}
	});

	heroSearchInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			heroSearchBtn.click();
		}
	});

    const tabs = document.querySelectorAll('.help-tab');
    const contents = document.querySelectorAll('.help-cards');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all content
            contents.forEach(content => content.classList.remove('active'));

            // Show target content
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

	document.querySelector('.cta-button').addEventListener('click', () => {
		window.location.href = '/frontend/guest/pre-approved.html'
	})

	// Modal functionality
    const modalOverlay = document.getElementById('disclosure-modal');
    const modalCloseIcon = document.getElementById('disclosure-modal-close-icon');
    const modalCloseBtn = document.getElementById('disclosure-modal-btn');
    const disclosureLink = document.querySelector('.disclosure-link');

    if (disclosureLink) {
        disclosureLink.addEventListener('click', (e)  => {
			e.preventDefault();
			openModal();
		});
    }

    if (modalCloseIcon) {
        modalCloseIcon.addEventListener('click', closeModal);
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
}

async function loadFeatured(){
	try {
        const queryString = new URLSearchParams({
            key: 'featured',
        }).toString();

		const res = await fetch(`${HOME_API_BASE}/home/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("propertiesGrid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${HOME_API_BASE}/properties/${property.property_id}/images`, {
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

            // Image navigation setup
            let currentImageIndex = 0;
            const propertyImage = propertyInfo.querySelector('.property-card-image');
            const currentImageSpan = propertyInfo.querySelector('.current-image');
            const prevBtn = propertyInfo.querySelector('.image-nav-prev');
            const nextBtn = propertyInfo.querySelector('.image-nav-next');

            // Hide navigation if only one image
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
						document.querySelector('.nav-signup-btn').click()
					})
				}
				
			}catch(error){
				console.error("Error loading favorites:", error)
			}
		};

	} catch (error) {
		console.error(error);
		const errorAlert = document.getElementById("error-alert")
        errorAlert.style.display = "block"
	}
}

async function loadLatest(){
	try {
        const queryString = new URLSearchParams({
            key: 'latest',
        }).toString();

		const res = await fetch(`${HOME_API_BASE}/home/properties/?${queryString}`, {
			credentials: "include",
		});

        const emptyAlert = document.getElementById("latest-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("latestGrid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${HOME_API_BASE}/properties/${property.property_id}/images`, {
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


            // Image navigation setup
            let currentImageIndex = 0;
            const propertyImage = propertyInfo.querySelector('.property-card-image');
            const currentImageSpan = propertyInfo.querySelector('.current-image');
            const prevBtn = propertyInfo.querySelector('.image-nav-prev');
            const nextBtn = propertyInfo.querySelector('.image-nav-next');

            // Hide navigation if only one image
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
						document.querySelector('.nav-signup-btn').click()
					})
				}
				
			}catch(error){
				console.error("Error loading favorites:", error)
			}
		};

	} catch (error) {
		console.error(error);
		const errorAlert = document.getElementById("latest-error-alert")
        errorAlert.style.display = "block"
	}
}

async function addToFavorites(propertyData){
	try {
		const propertyId = propertyData.property_id

		const response = await fetch(`/api/favorites/${propertyId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken()
			},
			credentials: "include",
			body: JSON.stringify(propertyData)
		})

		if(!response.ok){
			throw new Error('Failed to add property to favorites')
		}

		window.loadFavoritesMini()

	}catch(error){
		console.error(error)
		showToast('Failed to add property to favorites. Please try again later.', 'error')
	}
}

async function removeFavorites(propertyId){
	try {
		const response = await fetch(`/api/favorites/${propertyId}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken()
			}
		})

		if(!response.ok){
			throw new Error('Failed to remove property from favorites')
		}

		window.loadFavoritesMini()

	}catch(error){
		console.error(error)
		showToast('Failed to remove property from favorites. Please try again later.', 'error')
	}
}

function getPropertyStatus(status, element) {
    if (!element) return;
    element.classList.add(
      status === 'Sale' ? 'sale' :
      status === 'Sold' ? 'sold' : 'rent'
    );
}

function openModal() {
    const modalOverlay = document.getElementById('disclosure-modal');
    modalOverlay.style.display = 'flex';
    modalOverlay.offsetHeight;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modalOverlay = document.getElementById('disclosure-modal');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'scroll';

    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 300);
}