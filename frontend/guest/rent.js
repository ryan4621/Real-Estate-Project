//homepage.js

const RENT_API_BASE = '/public'

document.addEventListener('DOMContentLoaded', async () => {
	setUpRentEventListeners();
	loadLatest();
    loadPetFriendly();
    loadSingleFamily();
    loadPools();
});

function setUpRentEventListeners() {
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
			window.location.href = `/frontend/guest/rental-listings.html?search=${encodeURIComponent(searchValue)}`;
		} else {
			window.location.href = `/frontend/guest/rental-listings.html`;
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
			rentNavigation(navigateTerm)
		})
	})
}

async function loadLatest(){
	try {
        const queryString = new URLSearchParams({
            key: 'latest',
        }).toString();

		const res = await fetch(`${RENT_API_BASE}/rent/properties/?${queryString}`, {
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
		
		const propertiesGrid = document.getElementById("latest-grid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${RENT_API_BASE}/properties/${property.property_id}/images`, {
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
							<span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${Math.round(property.area).toLocaleString()}</strong> sqft</span>
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
		const errorAlert = document.getElementById("latest-error-alert")
        errorAlert.style.display = "block"
	}
}

async function loadPetFriendly(){
	try {
        const queryString = new URLSearchParams({
            key: 'pet-friendly',
        }).toString();

		const res = await fetch(`${RENT_API_BASE}/rent/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("pet-friendly-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("pet-friendly-grid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${RENT_API_BASE}/properties/${property.property_id}/images`, {
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
							<span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${Math.round(property.area).toLocaleString()}</strong> sqft</span>
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

async function loadSingleFamily(){
	try {
        const queryString = new URLSearchParams({
            key: 'single-family',
        }).toString();

		const res = await fetch(`${RENT_API_BASE}/rent/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("single-family-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("single-family-grid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${RENT_API_BASE}/properties/${property.property_id}/images`, {
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
			: ["/images/properties-backup.jpeg"];

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
							<span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${Math.round(property.area).toLocaleString()}</strong> sqft</span>
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

async function loadPools(){
	try {
        const queryString = new URLSearchParams({
            key: 'pools',
        }).toString();

		const res = await fetch(`${RENT_API_BASE}/rent/properties/?${queryString}`, {
			credentials: "include",
		});

		const emptyAlert = document.getElementById("pools-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();

		console.log(data)
		
		const propertiesGrid = document.getElementById("pools-grid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${RENT_API_BASE}/properties/${property.property_id}/images`, {
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
			: ["/images/properties-backup.jpeg"];

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
							<span class="property-card-detail"><strong>${escapeHtml(property.bedrooms)}</strong> bed</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${escapeHtml(property.bathrooms)}</strong> bath</span>
							<span class="property-card-separator">|</span>
							<span class="property-card-detail"><strong>${Math.round(property.area).toLocaleString()}</strong> sqft</span>
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
		const errorAlert = document.getElementById("pools-error-alert")
        errorAlert.style.display = "block"
	}
}

function rentNavigation(navigateTerm) {

    const params = new URLSearchParams();

	let targetPage = '/frontend/guest/rental_listings.html';

	if( navigateTerm === 'latest'){
		params.append('sort', 'newest')
	}else if(navigateTerm === 'pet-friendly'){
        params.append('amenities', 'pet-friendly')
	}else if(navigateTerm === 'single-family'){
		params.append('type', 'Single Family')
	}else if(navigateTerm === 'pools'){
        params.append('amenities', 'pools')
	}

	params.append('search', 'Los Angeles, California')

    window.location.href = `${targetPage}?${params.toString()}`;
}