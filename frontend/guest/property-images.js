// property-images.js

const PROPERTY_API_BASE = '/public';

document.addEventListener('DOMContentLoaded', () => {
    loadPropertyImagesPage();
    setUpPropertyImagesEventListener();
});

function setUpPropertyImagesEventListener(){
    document.querySelector('.property-images-back-btn').addEventListener('click', () => {
        history.back();
    });
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
        // Fetch all property images
        const propertyImagesRes = await fetch(`${PROPERTY_API_BASE}/properties/${propertyId}/images`, {
            credentials: 'include'
        });

        if (!propertyImagesRes.ok) {
            showToast('Failed to load property images', 'error');
            return;
        }

        const images = await propertyImagesRes.json();

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

function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, s => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	}[s]));
}