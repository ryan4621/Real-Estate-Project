const PROPERTY_API_BASE = '/public'

let propertyInquiryId;

// document.addEventListener('DOMContentLoaded', async ()  => {
//     loadPropertyPage();
//     // setUpEventListeners()
//     // checkUserAuthStatus();
// });

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        loadPropertyPage();
    } else {
        loadPropertyPage();
    }
});

window.addEventListener("scroll", () => {
    const target = document.querySelector(".property-action-bar");
    const triggerPoint = 300;
  
    if (window.scrollY >= triggerPoint) {
      target.classList.add("scrolled");
    } else {
      target.classList.remove("scrolled");
    }
});

async function loadPropertyPage(){
    const params = new URLSearchParams(window.location.search)
    const propertyId = params.get('id')

	try {
		const response = await fetch(`${PROPERTY_API_BASE}/properties/${propertyId}`, {
			credentials: 'include'
		});

		if(!response.ok){
			showToast("Error loading property. Please try again later.", "error")
			return
		};

		const propertyData = await response.json();

        const propertyDetailsPage =  document.getElementById('property-details-page')
        propertyDetailsPage.innerHTML = ""

        if(propertyData.length === 0){
            propertyDetailsPage.innerHTML = 
            `
                <div class="alert alert-warning" id="empty-alert">
                    <i class="fas fa-info-circle"></i> No properties found.
                </div>
            `
            return;
        }

        const propertyImagesRes = await fetch(`${PROPERTY_API_BASE}/properties/${propertyData.property_id}/images`, {
            credentials: 'include'
        });

        const images = await propertyImagesRes.json();

        const primaryImage = images.find(img => img.is_primary)?.image_url || "/images/properties-backup.jpeg";

        // Filter out primary images and videos first
        const filteredImages = images
        .filter(img => !img.is_primary)
        .filter(img => !img.image_url.endsWith('.mp4') && !img.image_url.endsWith('.mov'));

        // Keep track of sections already used
        const seenSections = new Set();
        const uniqueSectionImages = [];

        for (const img of filteredImages) {
            if (!seenSections.has(img.property_section)) {
                uniqueSectionImages.push(img);
                seenSections.add(img.property_section);
            }
        }

        const imagesToDisplay = uniqueSectionImages.slice(0, 3);

        const thumbnailHtml = imagesToDisplay.map(img => `
            <div class="property-secondary-images">
                <span class="property-section-badge">${img.property_section}</span>
                <img src="${img.image_url}" alt="Property Thumbnail" class="property-thumbnail-img">
            </div>
        `).join('');

        // After fetching property images, fetch amenities
        const amenitiesRes = await fetch(`${PROPERTY_API_BASE}/properties/${propertyData.property_id}/amenities`, {
            credentials: 'include'
        });

        let amenitiesHtml = '';
        if (amenitiesRes.ok) {
            const amenitiesData = await amenitiesRes.json();
            
            if (amenitiesData) {
                // Map of amenity keys to display labels with icons
                const amenitiesMap = {
                    swimming_pool: { label: 'Swimming Pool', icon: 'bi-water' },
                    elevator: { label: 'Elevator', icon: 'bi-arrow-up-square' },
                    high_ceiling: { label: 'High Ceiling', icon: 'bi-arrows-expand' },
                    hardwood_floors: { label: 'Hardwood Floors', icon: 'bi-grid-3x3' },
                    game_room: { label: 'Game Room', icon: 'bi-controller' },
                    gourmet_kitchen: { label: 'Gourmet Kitchen', icon: 'bi-egg-fried' },
                    ensuite: { label: 'Ensuite', icon: 'bi-door-open' },
                    water_view: { label: 'Water View', icon: 'bi-water' },
                    city_view: { label: 'City View', icon: 'bi-building' },
                    pets_allowed: { label: 'Pets Allowed', icon: 'bi-heart' },
                    guest_house: { label: 'Guest House', icon: 'bi-house' },
                    single_story: { label: 'Single Story', icon: 'bi-layers' },
                    security_features: { label: 'Security Features', icon: 'bi-shield-check' },
                    water_front: { label: 'Water Front', icon: 'bi-water' },
                    gym: { label: 'Gym', icon: 'bi-heart-pulse' },
                    community_gym: { label: 'Community Gym', icon: 'bi-people' },
                    library: { label: 'Library', icon: 'bi-book' },
                    fitness_centre: { label: 'Fitness Centre', icon: 'bi-bicycle' },
                    club_house: { label: 'Club House', icon: 'bi-building' },
                    garage: { label: 'Garage', icon: 'bi-car-front' },
                    recreational_amenities: { label: 'Recreational Amenities', icon: 'bi-tree' },
                    tennis_court: { label: 'Tennis Court', icon: 'bi-trophy' },
                    fireplace: { label: 'Fireplace', icon: 'bi-fire' },
                    multi_stories: { label: 'Multi Stories', icon: 'bi-layers' },
                    courtyard_style: { label: 'Courtyard Style', icon: 'bi-flower1' },
                    rv_parking: { label: 'RV Parking', icon: 'bi-truck' }
                };

                // Build amenities HTML
                const amenitiesList = [];
                for (const [key, config] of Object.entries(amenitiesMap)) {
                    if (amenitiesData[key]) {
                        amenitiesList.push(`
                            <div class="amenity-item">
                                <span>${config.label}</span>
                            </div>
                        `);
                    }
                }

                if (amenitiesList.length > 0) {
                    amenitiesHtml = `
                        <div class="amenities-container">
                            ${amenitiesList.join('')}
                        </div>
                    `;
                } else {
                    amenitiesHtml = '';
                }
            }
        }

        const address = `${propertyData.street_number} ${propertyData.street_name}`
        const propertyLocation = `${propertyData.street_number} ${propertyData.street_name} ${propertyData.city} ${propertyData.state} ${propertyData.zip}`
        const location = `${propertyData.city} ${propertyData.state} ${propertyData.zip}`
        const listedDate = new Date(propertyData.created_at)
        const updatedDate = new Date(propertyData.updated_at)
        const soldDate = new Date(propertyData.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        const propertyActionBar =  document.getElementById('property-action-bar');

        propertyActionBar.innerHTML = ''

        const propertyActionBarContainer = document.createElement('div')
        propertyActionBarContainer.classList.add('property-action-bar-container')
        propertyActionBarContainer.innerHTML = `
            <div class="property-action-bar-container">
                <button class="property-back-btn" id="property-back-btn">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="property-action-icons">
                    <button class="property-action-favorite" id="property-action-favorite">
                        <i class="bi bi-heart heart-empty"></i>
                        <i class="bi bi-heart-fill heart-filled"></i>
                    </button>
                    <button class="property-action-share">
                        <i class="bi bi-upload"></i>
                    </button>
                </div>
            </div>
        `
        propertyActionBar.appendChild(propertyActionBarContainer)
        const heartEmpty = propertyActionBarContainer.querySelector('.heart-empty');
        const heartFilled = propertyActionBarContainer.querySelector('.heart-filled');
        const propertyActionFavorite = propertyActionBarContainer.querySelector('.property-action-favorite');

        document.getElementById('property-back-btn').addEventListener('click', () => {
            history.back();
        });

        const propertyDetailsContainer = document.createElement('div')
        propertyDetailsContainer.classList.add('property-details-container')
        propertyDetailsContainer.innerHTML = `
            <div class="property-details-main">
                <div class="property-top">
                    <span>Listed by: <span class="value">${escapeHtml(propertyData.agent_name)}</span></span>
                    <span>Brokered by: <span class="value">${escapeHtml(propertyData.broker)}</span></span>
                </div>
                <section class="property-images-section">
                    <div class="property-main-image">
                        <img src="${primaryImage}" alt="Main Property Image" class="property-featured-img">

                        <button class="property-image-nav-btn property-image-nav-prev">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <button class="property-image-nav-btn property-image-nav-next">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                        <div class="property-image-counter">
                            <span class="property-current-image">1</span>/<span class="property-total-images">1</span>
                        </div>
                    </div>
                    <div class="property-thumbnail-grid">${thumbnailHtml}</div>
                </section>

                <section class="property-header-section">                  
                    <div class="property-card-top">
                        <span class="${propertyData.status === 'Sold' ? 'red-dot' : 'green-dot'}"></span>
                        <span class="property-type">
                        ${propertyData.status === 'Sold'
                            ? `Sold - ${soldDate}`
                            : escapeHtml(propertyData.property_type)}
                        </span>
					</div>
                    <div class="property-price-wrapper">
                        <div class="property-price">
                            <h1 class="property-price-amount">$${Math.round(propertyData.price).toLocaleString()}</h1>
                        </div>
                        <div class="property-details">
							<span class="property-detail"><strong>${escapeHtml(propertyData.bedrooms)}</strong> bed</span>
							<span class="property-detail"><strong>${escapeHtml(propertyData.bathrooms)}</strong> bath</span>
							<span class="property-detail"><strong>${Math.round(propertyData.area).toLocaleString()}</strong> sqft</span>
						</div>
                    </div>
                    <div class="property-address-wrapper">
                        <p class="property-address-text">${escapeHtml(propertyLocation)}</p>
                    </div>
                    <span class="property-pre-approved">Get pre-approved</span>
                </section>

                <section class="property-overview-section">
                    <div class="property-amenities">
                        ${amenitiesHtml}
                    </div>
                    <div class="property-overview-grid">
                        <div class="property-overview-item">
                            <div class="property-overview-icon">
                                <i class="bi bi-house"></i>
                            </div> 
                            <div class="property-overview-info">
                                <span class="property-overview-label">Property Type</span>
                                <span class="property-overview-value">${escapeHtml(propertyData.property_type)}</span> 
                            </div>  
                        </div>
                        <div class="property-overview-item">
                            <div class="property-overview-icon">
                                <i class="bi bi-rulers"></i>
                            </div>
                            <div class="property-overview-info">
                                <span class="property-overview-label">Price per sqft</span>
                                <span class="property-overview-value">$${Math.round(propertyData.price_per_sqft).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="property-overview-item">
                            <div class="property-overview-icon">
                                <i class="bi bi-car-front"></i>
                            </div>
                            <div class="property-overview-info">
                                <span class="property-overview-label">Garage Space</span>
                                <span class="property-overview-value">${escapeHtml(propertyData.garage_space)} Car</span>
                            </div>
                        </div>
                        <div class="property-overview-item">
                            <div class="property-overview-icon">
                                <i class="bi bi-hammer"></i>
                            </div>
                            <div class="property-overview-info">
                                <span class="property-overview-label">Year Built</span>
                                <span class="property-overview-value">${escapeHtml(propertyData.year_built)}</span>
                            </div>
                        </div>
                        <div class="property-overview-item">
                            <div class="property-overview-icon">
                                <i class="bi bi-bounding-box-circles"></i>
                            </div>
                            <div class="property-overview-info">
                                <span class="property-overview-label">Lot Size</span>
                                <span class="property-overview-value">${escapeHtml(propertyData.acre_lot)} acres</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="property-description-section">
                    <h2 class="property-section-title">Description</h2>
                    <p class="property-description-text">${escapeHtml(propertyData.description)}</p>
                </section>

                <section class="property-location-section">
                    <h2 class="property-section-title">Location Details</h2>
                    <div class="property-location-grid">
                        <div class="property-location-item">
                            <span class="property-location-label">Street</span>
                            <span class="property-location-value">${escapeHtml(address)}</span>
                        </div>
                        <div class="property-location-item">
                            <span class="property-location-label">City</span>
                            <span class="property-location-value">${escapeHtml(propertyData.city)}</span>
                        </div>
                        <div class="property-location-item">
                            <span class="property-location-label">State</span>
                            <span class="property-location-value">${escapeHtml(propertyData.state)}</span>
                        </div>
                        <div class="property-location-item">
                            <span class="property-location-label">Country</span>
                            <span class="property-location-value">${escapeHtml(propertyData.country)}</span>
                        </div>
                        <div class="property-location-item">
                            <span class="property-location-label">Latitude</span>
                            <span class="property-location-value">${escapeHtml(propertyData.latitude)}</span>
                        </div>
                        <div class="property-location-item">
                            <span class="property-location-label">Longitude</span>
                            <span class="property-location-value">${escapeHtml(propertyData.longitude)}</span>
                        </div>
                    </div>
                </section>

                <section class="property-dates-section">
                    <div class="property-dates-grid">
                        <div class="property-date-item">
                            <span class="property-date-label">Listed On</span>
                            <span class="property-date-value">${listedDate.toLocaleString()}</span>
                        </div>
                        <div class="property-date-item">
                            <span class="property-date-label">Last Updated</span>
                            <span class="property-date-value">${updatedDate.toLocaleString()}</span>
                        </div>
                    </div>
                </section>
            </div>

            <aside class="property-inquiry-sidebar">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Property Inquiry</h2>
                        <p>Get in touch with our agent</p>
                    </div>

                    <form id="inquiryForm">
                        <div class="form-group">
                            <label for="name">
                                Name <span class="required">*</span>
                            </label>
                            <input type="text" id="name" name="name" class="form-input" placeholder="Enter your full name" required>
                        </div>

                        <div class="form-group">
                            <label for="email">
                                Email <span class="required">*</span>
                            </label>
                            <input type="email" id="email" name="email" class="form-input" placeholder="your.email@example.com" required>
                        </div>

                        <div class="form-group">
                            <label for="phone">
                                Phone <span class="required">*</span>
                            </label>
                            <input type="tel" id="phone" name="phone" class="form-input" placeholder="(123) 456-7890" required>
                        </div>

                        <div class="form-group">
                            <label for="message">
                                Message <span class="required">*</span>
                            </label>
                            <textarea id="message" name="message" class="form-input" placeholder="Tell us about your interest in this property..." required></textarea>
                        </div>

                        <div class="checkbox-group">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="requestTour" name="requestTour">
                                <label for="requestTour">Request Tour</label>
                            </div>
                        </div>

                        <button type="submit" class="submit-btn" id="submit-btn">Email Agent</button>
                    </form>
                </div>
            </aside>
        `
        const statusElement = propertyDetailsContainer.querySelector('.property-status-badge');
        getPropertyStatus(propertyData.status, statusElement);

        propertyDetailsPage.appendChild(propertyDetailsContainer)

        // After this line: propertyDetailsPage.appendChild(propertyDetailsContainer)

        // Add click listener to main image to navigate to all photos
        const mainImage = propertyDetailsContainer.querySelector('.property-main-image');
        mainImage.addEventListener('click', () => {
            window.location.href = `/frontend/guest/property-images.html?id=${propertyData.property_id}&section=all`;
        });

        // Add click listeners to thumbnail images to navigate to specific sections
        const thumbnails = propertyDetailsContainer.querySelectorAll('.property-secondary-images');
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', () => {
                const section = thumbnail.querySelector('.property-section-badge').textContent;
                window.location.href = `/frontend/guest/property-images.html?id=${propertyData.property_id}&section=${encodeURIComponent(section)}`;
            });
        });

        let currentImageIndex = 0;
        const allImages = images.map(img => img.image_url);
        const propertyFeaturedImg = propertyDetailsContainer.querySelector('.property-featured-img');
        const propertyMainImageWrapper = propertyDetailsContainer.querySelector('.property-main-image');
        const currentImageCounter = propertyMainImageWrapper.querySelector('.property-current-image');
        const totalImageCounter = propertyMainImageWrapper.querySelector('.property-total-images');
        const prevNavBtn = propertyMainImageWrapper.querySelector('.property-image-nav-prev');
        const nextNavBtn = propertyMainImageWrapper.querySelector('.property-image-nav-next');

        // Update total images count
        totalImageCounter.textContent = allImages.length;

        // Hide navigation if only one image
        if (allImages.length <= 1) {
            prevNavBtn.style.display = 'none';
            nextNavBtn.style.display = 'none';
        }

        // Previous button click
        prevNavBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
            propertyFeaturedImg.src = allImages[currentImageIndex];
            currentImageCounter.textContent = currentImageIndex + 1;
        });

        // Next button click
        nextNavBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex + 1) % allImages.length;
            propertyFeaturedImg.src = allImages[currentImageIndex];
            currentImageCounter.textContent = currentImageIndex + 1;
        });

        checkUserAuthStatus(heartEmpty, heartFilled, propertyActionFavorite, propertyData, primaryImage, address, location)
        const submitBtn = document.getElementById('submit-btn')

        const form = document.getElementById('inquiryForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitBtn.textContent = 'Sending Email...'
            submitBtn.disabled = true;
            inquiryFormSubmit(propertyData.property_id, propertyData.agent_email);
        });

	}catch(error){
		console.error("Error loading property page:", error)
		showToast("Failed to load property page", "error")
	}
};

async function checkUserAuthStatus(heartEmpty, heartFilled, propertyActionFavorite, propertyData, primaryImage, address, location) {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const favRes = await fetch(`/api/favorites/${propertyData.property_id}`, { credentials: "include" });

            let isFavorited = false;

            if (favRes.ok) {
                const favorites = await favRes.json();
                const favData = favorites.data[0];
                isFavorited = favData.property_id === propertyData.property_id;
            }

            if (isFavorited) {
                heartEmpty.style.display = 'none';
                heartFilled.style.display = 'block';
            } else {
                heartFilled.style.display = 'none';
                heartEmpty.style.display = 'block';
            }

            propertyActionFavorite.addEventListener('click', (e) => {
                e.stopPropagation();

                const isEmptyVisible = heartEmpty.style.display !== 'none';

                if(isEmptyVisible){
                    heartEmpty.style.display = 'none';
                    heartFilled.style.display = 'block';
                    addToFavorites({ ...propertyData, primaryImage, address, location });
                }else {
                    heartFilled.style.display = 'none'
                    heartEmpty.style.display = 'block'
                    removeFavorites(propertyData.property_id)
                }
            });

            const user = await response.json();
            populateFormFields(user)
        }else {
            heartFilled.style.display = 'none';
            heartEmpty.style.display = 'block';

            propertyActionFavorite.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.nav-signup-btn').click()
            })
        }
        
    } catch (error) {
        console.error('Auth check failed:', error);
        heartEmpty.style.display = 'block';
        heartFilled.style.display = 'none';
    }
}

async function populateFormFields(user){
    
    const firstName = user.first_name
    const lastName = user.last_name

    const name = `${firstName} ${lastName}`

    document.getElementById('name').value = name || ''
    document.getElementById('email').value = user.email || ''
}

async function inquiryFormSubmit(propertyId, agentEmail) {

    const submitBtn = document.getElementById('submit-btn');
    const name = document.getElementById('name').value.trim()
    const email = document.getElementById('email').value.trim()
    const phone = document.getElementById('phone').value.trim()
    const message = document.getElementById('message').value.trim()

    const requestTour = document.getElementById('requestTour')
    const isChecked = requestTour.checked

    try {

        if(!name || !email || !phone || !message){
            showToast("Fill all fields before submitting", "error")
            return;
        };

        const checkAuth = await fetch('/auth/me', {
            credentials: "include"
        })

        const userData = await checkAuth.json();
        const userId = userData.id
        const inquiryData = { userId, name, email, phone, message, isChecked, agentEmail }

        const inquiryResponse = await fetch(`${PROPERTY_API_BASE}/inquiries/${propertyId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(inquiryData)
        });

        const data = await inquiryResponse.json();

        if(!inquiryResponse.ok){
            showToast("Error submitting form. Please try again later.", "error")
            submitBtn.textContent = 'Email Agent'
            // submitBtn.disabled = false;
            throw new Error("Error submitting form. Please try again later.")
        }

        if(data.data.isChecked){
            reloadWithToast("Property tour request sent. Agent will contact you with 5 hours.", "success")
            submitBtn.textContent = 'Email Agent'
            // submitBtn.disabled = false;
            return
        }
        
        submitBtn.textContent = 'Email Agent'
        submitBtn.disabled = false;
        reloadWithToast(data.message, 'success')

    }catch(error){
        console.error("Error submitting inquiry:", error)
        showToast("Error submitting inquiry. Please try again later.", "error")
    }
};