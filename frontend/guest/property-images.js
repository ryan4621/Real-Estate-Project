// property-images.js

const PROPERTY_API_BASE = '/public';
let propertyDataGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    loadPropertyImagesPage();
    setUpPropertyImagesEventListener();
});

function setUpPropertyImagesEventListener(){
    document.querySelector('.property-images-back-btn').addEventListener('click', () => {
        history.back();
    });

    // Contact Agent Modal Listeners
    const contactBtn = document.querySelector('.property-images-contact-btn');
    const contactOverlay = document.querySelector('.contact-agent-overlay');
    const contactModal = document.querySelector('.contact-agent-modal');
    const contactCloseBtn = document.querySelector('.contact-agent-close');

    if (contactBtn) {
        contactBtn.addEventListener('click', () => {
            contactOverlay.classList.add('active');
            contactModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    function closeContactModal() {
        contactOverlay.classList.remove('active');
        contactModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (contactCloseBtn) contactCloseBtn.addEventListener('click', closeContactModal);
    if (contactOverlay) contactOverlay.addEventListener('click', closeContactModal);

    // Form Submit
    const form = document.getElementById('contactAgentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (propertyDataGlobal) {
                inquiryFormSubmit(propertyDataGlobal.property_id, propertyDataGlobal.agent_email);
            } else {
                showToast("Property data not loaded", "error");
            }
        });
    }
}

function formatSectionName(section) {
    return section
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

async function loadPropertyImagesPage() {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('id');

    if (!propertyId) {
        showToast('Property ID not found', 'error');
        return;
    }

    try {
        // Fetch property details first
        const propertyRes = await fetch(`${PROPERTY_API_BASE}/properties/${propertyId}`, {
            credentials: 'include'
        });

        if (!propertyRes.ok) {
            showToast("Error loading property details", "error");
            return;
        }

        propertyDataGlobal = await propertyRes.json();


        // Fetch all property images
        const propertyImagesRes = await fetch(`${PROPERTY_API_BASE}/properties/${propertyId}/images`, {
            credentials: 'include'
        });

        if (!propertyImagesRes.ok) {
            showToast('Failed to load property images', 'error');
            return;
        }

        const images = await propertyImagesRes.json();
        
        // Find primary image for favorites
        const primaryImage = images.find(img => img.is_primary)?.image_url || "/images/properties-backup.jpeg";
        // Construct address for favorites
        const address = `${propertyDataGlobal.street_number} ${propertyDataGlobal.street_name}`;
        const location = `${propertyDataGlobal.city} ${propertyDataGlobal.state} ${propertyDataGlobal.zip}`;

        // Check Auth and Setup Favorites
        checkUserAuthStatus(propertyDataGlobal, primaryImage, address, location);


        // Filter out videos
        const filteredImages = images.filter(img => 
            !img.image_url.endsWith('.mp4') && 
            !img.image_url.endsWith('.mov')
        );

        if (filteredImages.length === 0) {
            document.getElementById('property-images-grid').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <i class="bi bi-image" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 16px; color: #666; font-size: 18px;">No images available for this property</p>
                </div>
            `;
            return;
        }

        // Sort primary image to be first
        const sortedImages = filteredImages.sort((a, b) => {
            if (a.is_primary) return -1;
            if (b.is_primary) return 1;
            return 0;
        });

        // Get unique sections with their image counts
        const sectionCounts = {};
        filteredImages.forEach(img => {
            const section = img.property_section || 'Other';
            sectionCounts[section] = (sectionCounts[section] || 0) + 1;
        });

        // Render tabs
        renderPropertyImagesTabs(sectionCounts, sortedImages.length);

        const sectionParam = params.get('section') || 'all';

        // Render images based on section parameter
        if (sectionParam === 'all') {
            renderPropertyImages(sortedImages, 'all');
        } else {
            renderPropertyImages(sortedImages, sectionParam);
        }

        // Set active tab based on section parameter
        const tabs = document.querySelectorAll('.property-images-tab');
        tabs.forEach(tab => {
            if (tab.dataset.section === sectionParam) {
                tab.classList.add('active');
            } else if (sectionParam === 'all' && tab.dataset.section === 'all') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Add tab click listeners
        setupPropertyImagesTabListeners(sortedImages);

    } catch (error) {
        console.error('Error loading property images page:', error);
        showToast('Failed to load property images', 'error');
    }
}

function renderPropertyImagesTabs(sectionCounts, totalImages) {
    const tabsContainer = document.getElementById('property-images-tabs');
    
    // Create "All photos" tab
    let tabsHtml = `
        <button class="property-images-tab active" data-section="all">
            All photos
        </button>
    `;

    // Create tabs for each section with count
    for (const [section, count] of Object.entries(sectionCounts)) {
        const formattedSection = formatSectionName(section);
        tabsHtml += `
            <button class="property-images-tab" data-section="${escapeHtml(section)}">
                ${escapeHtml(formattedSection)} (${count})
            </button>
        `;
    }

    // Add Street view tab (placeholder)
    tabsHtml += `
        <button class="property-images-tab" data-section="street-view">
            Street view
        </button>
    `;

    tabsContainer.innerHTML = tabsHtml;
}

function renderPropertyImages(images, sectionFilter = 'all') {
    const gridContainer = document.getElementById('property-images-grid');
    
    // Filter images based on section
    let filteredImages = images;
    if (sectionFilter !== 'all') {
        filteredImages = images.filter(img => 
            img.property_section === sectionFilter
        );
    }

    if (filteredImages.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="bi bi-image" style="font-size: 48px; color: #ccc;"></i>
                <p style="margin-top: 16px; color: #666;">No images in this section</p>
            </div>
        `;
        return;
    }

    // Render images
    const imagesHtml = filteredImages.map((img, index) => `
        <div class="property-images-grid-item" data-index="${index}">
            <img src="${img.image_url}" alt="${escapeHtml(img.property_section || 'Property Image')}" loading="lazy">
        </div>
    `).join('');

    gridContainer.innerHTML = imagesHtml;
}

function setupPropertyImagesTabListeners(allImages) {
    const tabs = document.querySelectorAll('.property-images-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Render images for selected section
            if (section === 'all') {
                renderPropertyImages(allImages, 'all');
            } else if (section === 'street-view') {
                // Handle street view
                document.getElementById('property-images-grid').innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <i class="bi bi-map" style="font-size: 48px; color: #ccc;"></i>
                        <p style="margin-top: 16px; color: #666; font-size: 18px;">Street view not available</p>
                    </div>
                `;
            } else {
                renderPropertyImages(allImages, section);
            }
        });
    });
}

function updateHeaderHeight() {
    const header = document.querySelector('.property-images-header');
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
}

updateHeaderHeight();
window.addEventListener('resize', updateHeaderHeight);

function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, s => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	}[s]));
}


async function checkUserAuthStatus(propertyData, primaryImage, address, location) {
    const heartIcon = document.querySelector('.property-images-save-btn i');
    const saveBtn = document.querySelector('.property-images-save-btn');
    const saveText = document.querySelector('.property-images-save-btn span');
    
    if (!heartIcon || !saveBtn) return;

    // Reset state
    heartIcon.classList.remove('bi-heart-fill');
    heartIcon.classList.add('bi-heart');
    heartIcon.style.color = '';
    if (saveText) saveText.textContent = 'Save';

    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const user = await response.json();
            populateFormFields(user);

            const favRes = await fetch(`/api/favorites/${propertyData.property_id}`, { credentials: "include" });

            let isFavorited = false;

            if (favRes.ok) {
                const favorites = await favRes.json();
                const favData = favorites.data[0];
                isFavorited = favData && favData.property_id === propertyData.property_id;
            }

            if (isFavorited) {
                heartIcon.classList.remove('bi-heart');
                heartIcon.classList.add('bi-heart-fill');
                heartIcon.style.color = '#d92228';
                if (saveText) saveText.textContent = 'Saved';
            }

            // Remove old listeners to avoid duplicates if any (simple approach: clone or just add new one if we assume single run)
            // Ideally we cloneNode to remove listeners, but here we just add one listener.
            // But verify if checkUserAuthStatus is called multiple times? Only called once in loadPropertyImagesPage.

            saveBtn.onclick = (e) => {
                e.preventDefault();
                const isSaved = heartIcon.classList.contains('bi-heart-fill');

                if (isSaved) {
                    heartIcon.classList.remove('bi-heart-fill');
                    heartIcon.classList.add('bi-heart');
                    heartIcon.style.color = '';
                    if (saveText) saveText.textContent = 'Save';
                    removeFavorites(propertyData.property_id);
                } else {
                    heartIcon.classList.remove('bi-heart');
                    heartIcon.classList.add('bi-heart-fill');
                    heartIcon.style.color = '#d92228';
                    if (saveText) saveText.textContent = 'Saved';
                    addToFavorites({ ...propertyData, primaryImage, address, location });
                }
            };

        } else {
            // Not logged in
            saveBtn.onclick = (e) => {
                e.preventDefault();
                // Click the hidden nav signup btn which register.js listens to
                const navSignupBtn = document.querySelector('.nav-signup-btn');
                if (navSignupBtn) navSignupBtn.click();
            };
        }
        
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function populateFormFields(user){
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');

    if(nameInput) nameInput.value = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if(emailInput) emailInput.value = user.email || '';
}

async function inquiryFormSubmit(propertyId, agentEmail) {

    const submitBtn = document.getElementById('contact-submit-btn');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value.trim();

    const requestTour = document.getElementById('requestTour');
    const isChecked = requestTour ? requestTour.checked : false;

    try {

        if(!name || !email || !phone || !message){
            showToast("Fill all fields before submitting", "error")
            return;
        };
        
        if(submitBtn) {
            submitBtn.textContent = 'Sending Email...';
            submitBtn.disabled = true;
        }

        const checkAuth = await fetch('/auth/me', {
            credentials: "include"
        })

        const userData = await checkAuth.json();
        const userId = userData.id || null; // allow null if not logged in? property.js seems to expect userId from auth check.
        // property.js snippet: const userId = userData.id
        // If not logged in, inquiry calls fail usually? The property endpoint works for guests?
        // property.js assumes userData.id exists. If checkAuth fails (401), .json() throws or returns error.
        
        // Wait, property.js:
        // const checkAuth = await fetch('/auth/me'...)
        // const userData = await checkAuth.json();
        // const userId = userData.id
        
        // If user is guest, can they submit inquiry?
        // If `/auth/me` returns 401, checkAuth.json() might be {message: "Unauthorized"}.
        // Then `userId` is undefined.
        // `inquiryData = { userId, ... }`.
        
        // Let's assume guest inquiry is allowed and backend handles null userId, OR catch error.
        
        const inquiryData = { userId, name, email, phone, message, isChecked, agentEmail };

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
            if(submitBtn) {
                submitBtn.textContent = 'Email Agent';
                submitBtn.disabled = false;
            }
            showToast(data.message || "Error submitting form.", "error");
            return;
        }

        if(submitBtn) {
            submitBtn.textContent = 'Email Agent';
            submitBtn.disabled = false;
        }
        
        // Close modal and show success toast (or reload)
        document.querySelector('.contact-agent-overlay').classList.remove('active');
        document.querySelector('.contact-agent-modal').classList.remove('active');
        document.body.style.overflow = '';
        
        if(data.data && data.data.isChecked){
             showToast("Property tour request sent. Agent will contact you within 5 hours.", "success");
        } else {
             showToast(data.message, 'success');
        }
        
        // Clear form
        document.getElementById('contactAgentForm').reset();


    }catch(error){
        console.error("Error submitting inquiry:", error);
        showToast("Error submitting inquiry. Please try again later.", "error");
        const submitBtn = document.getElementById('contact-submit-btn');
        if(submitBtn) {
            submitBtn.textContent = 'Email Agent';
            submitBtn.disabled = false;
        }
    }
};