//homepage.js

const HOME_API_BASE = '/public'

document.addEventListener('DOMContentLoaded', async () => {
	const page = document.body.dataset.page;

	if (page === 'home') {
		loadFeatured();

	}else if (page === 'buy') {
		loadExpensive();
		loadAffordableHomes();
		loadOpenHouses();

	}

	setUpHomeEventListeners();
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

	document.querySelectorAll('.section-link').forEach(link => {
		link.addEventListener('click', (e) => {
			e.preventDefault()
			console.log("Section link clicked!")
            const navigateTerm = e.target.closest('a').dataset.id;
			homesNavigation(navigateTerm)
		})
	})

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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
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

//buy.html functions
async function loadExpensive(){
	try {
        const queryString = new URLSearchParams({
            key: 'expensive',
        }).toString();

		const res = await fetch(`${HOME_API_BASE}/buy/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("expensive-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("expensiveGrid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${HOME_API_BASE}/properties/${property.property_id}/images`, {
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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
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
						document.querySelector('.nav-signup-btn').click()
					})
				}
				
			}catch(error){
				console.error("Error loading expensive properties:", error)
			}
		};

	} catch (error) {
		console.error(error);
		const errorAlert = document.getElementById("expensive-error-alert")
        errorAlert.style.display = "block"
	}
}

async function loadAffordableHomes(){
	try {
        const queryString = new URLSearchParams({
            key: 'affordable',
        }).toString();

		const res = await fetch(`${HOME_API_BASE}/buy/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("affordable-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("affordableGrid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${HOME_API_BASE}/properties/${property.property_id}/images`, {
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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
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
						document.querySelector('.nav-signup-btn').click()
					})
				}
				
			}catch(error){
				console.error("Error loading affordable properties:", error)
			}
		};

	} catch (error) {
		console.error(error);
		const errorAlert = document.getElementById("affordable-error-alert")
        errorAlert.style.display = "block"
	}
}

async function loadOpenHouses(){
	try {
        const queryString = new URLSearchParams({
            key: 'open-houses',
        }).toString();

		const res = await fetch(`${HOME_API_BASE}/buy/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("open-houses-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("openHousesGrid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${HOME_API_BASE}/properties/${property.property_id}/images`, {
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
						<div class="property-card-top">
							<span class="green-dot"></span>
							<span class="property-card-type">${escapeHtml(property.property_type)}</span>
						</div>
						<div class="property-card-price">$${Math.round(property.price).toLocaleString()}</div>
						<div class="property-card-details">
							<span class="property-card-detail">${escapeHtml(property.bedrooms)} bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(property.bathrooms)} bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail">${escapeHtml(Math.round(property.area))} sqft</span>
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
						document.querySelector('.nav-signup-btn').click()
					})
				}
				
			}catch(error){
				console.error("Error loading open houses properties:", error)
			}
		};

	} catch (error) {
		console.error(error);
		const errorAlert = document.getElementById("open-houses-error-alert")
        errorAlert.style.display = "block"
	}
}

function homesNavigation(navigateTerm) {

    const params = new URLSearchParams();

	let targetPage = '/frontend/guest/for-sale.html';

	if(navigateTerm === 'expensive'){
		params.append('min_price', '1200000')
		params.append('max_price', '1600000')
	}else if(navigateTerm === 'latest'){
		params.append('sort', 'newest')
	}else if(navigateTerm === 'affordable'){
		params.append('min_price', '300000')
		params.append('max_price', '600000')
	}else if(navigateTerm === 'open-houses'){
		targetPage = '/frontend/guest/open-houses.html';
	}

	params.append('search', 'Los Angeles, California')

    window.location.href = `${targetPage}?${params.toString()}`;
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