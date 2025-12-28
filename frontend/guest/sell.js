//sell.js

const SOLD_API_BASE = '/public'

document.addEventListener('DOMContentLoaded', async () => {
	setUpSoldEventListeners();
	loadRecentlySold();
});

function setUpSoldEventListeners() {
	const searchWrapper = document.querySelector('.hero-search-wrapper');
	const heroSection = document.querySelector('.hero-section');

	window.addEventListener('scroll', () => {
		const heroBottom = heroSection.getBoundingClientRect().bottom;
		
		if (heroBottom <= 80) {
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
			window.location.href = `/frontend/guest/sold.html?search=${encodeURIComponent(searchValue)}`;
		} else {
			window.location.href = `/frontend/guest/sold.html`;
		}
	});

	heroSearchInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			heroSearchBtn.click();
		}
	});

	document.querySelector('.section-link').addEventListener('click', (e) => {
        e.preventDefault()
        window.location.href = '/frontend/guest/sold.html';
	});

    document.querySelectorAll('.sold-faq-question').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            
            header.classList.toggle('collapsed');
            if(content && content.classList.contains('sold-faq-answer')){
                content.classList.toggle('collapsed');
            }
        });
    });
}

async function loadRecentlySold(){
	try {

		const res = await fetch(`${SOLD_API_BASE}/sell/properties/`, {
			credentials: "include",
		});

        const emptyAlert = document.getElementById("recently-sold-empty-alert")

        if(!res.ok){
            if(res.status === 404){
                emptyAlert.style.display = "block";
            }else {
                throw new Error('Failed to load properties')
            }
            return
        }

		const data = await res.json();
		
		const propertiesGrid = document.getElementById("recently-sold-grid");
		propertiesGrid.innerHTML = "";

		for (const property of data.data) {
            const propertyImageRes = await fetch(`${SOLD_API_BASE}/properties/${property.property_id}/images`, {
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
            const updatedDate = new Date(property.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

			const propertyInfo = document.createElement("div");
            propertyInfo.classList.add('property-info')
			propertyInfo.innerHTML = `
				<div class="property-card">
					<div class="property-card-image-wrapper">
						<img src="${primaryImage}" alt="Property-Image" class="property-card-image">
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
							<span class="red-dot"></span>
							<span class="property-card-type">${escapeHtml(property.status)}</span> -
							<span class="property-card-sold-date">${escapeHtml(updatedDate.toLocaleString())}</span>
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