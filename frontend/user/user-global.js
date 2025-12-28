// navbar-auth.js

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const user = await response.json();
            renderLoggedInNav(user);
        } else {
            renderLoggedOutNav();
            // document.querySelector('.nav-load').classList.remove('show')
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        renderLoggedOutNav();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('.nav-load').classList.add('show')

    await checkAuthStatus();

    setupGlobalEventListeners();
});

function renderLoggedInNav(user) {
    const navbarContainer = document.getElementById('navbar-container');
    const signupBtn = navbarContainer.querySelector('.nav-signup-btn');
    
    // Hide signup button
    if (signupBtn) {
        signupBtn.classList.remove('show');
    }

    const navLoad = document.querySelector('.nav-load')
    if(navLoad){
        navLoad.classList.remove('show')
    }

    // Check if already rendered
    if (navbarContainer.querySelector('.logged-in-nav')) {
        return;
    }

    const loggedInNav = document.createElement('div');
    loggedInNav.className = 'logged-in-nav';
    loggedInNav.innerHTML = `
        <button class="favorites-btn" id="favorites-btn">
            <i class="fa-regular fa-heart"></i>
        </button>
        
        <div class="user-profile-dropdown-wrapper">
            <button class="user-profile-btn" id="user-profile-btn">
                <i class="fa-regular fa-user logged-in-user"></i>
                <i class="fa-solid fa-chevron-down logged-in-nav-arrow"></i>
            </button>
            
            <div class="user-profile-dropdown" id="user-profile-dropdown">
                <button class="mobile-dropdown-close">
                    <i class="bi bi-x"></i>
                </button>
                <div class="dropdown-user-info">
                    <span class="dropdown-user-name">${user.first_name} ${user.last_name}</span>
                    <span class="dropdown-user-email">${user.email}</span>
                </div>
                <div class="dropdown-divider"></div>
                <a href="/frontend/user/user-settings.html?tab=buyer-profile" class="dropdown-link">My Profile</a>
                <a href="/dashboard" class="dropdown-link">Renter tools</a>
                <a href="/dashboard" class="dropdown-link">My home</a>
                <a href="/frontend/user/user-settings.html" class="dropdown-link">Settings</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-link logout-btn" id="logout-btn">Logout</a>
            </div>
        </div>

        <div class="favorites-dropdown" id="favorites-dropdown">
            <button class="mobile-dropdown-close">
                <i class="bi bi-x"></i>
            </button>
            <div class="favorites-dropdown-header">
                <h3>Saved Properties</h3>
            </div>

            <div class="favorites-dropdown-content" id="favorites-dropdown-content"></div>
            <a href="/frontend/user/user-favorites.html" class="dropdown-link">View All Favorites</a>

            <div class="dropdown-divider"></div>

            <div class="favorites-dropdown-header">
                <h3>Saved Searches</h3>
            </div>

            <div class="favorites-dropdown-content" id="ss-dropdown-content"></div>
            <a href="/frontend/user/user-favorites.html?tab=searches" class="dropdown-link">View Saved Searches</a>
        </div>
    `;

    navbarContainer.appendChild(loggedInNav);
    setupDropdownListeners();

    loadFavoritesMini();
    loadSearchesMini();
}

function renderLoggedOutNav() {
    const navbarContainer = document.getElementById('navbar-container');
    const loggedInNav = navbarContainer.querySelector('.logged-in-nav');
    
    if (loggedInNav) {
        loggedInNav.remove();
    }

    const navLoad = document.querySelector('.nav-load')
    if(navLoad){
        navLoad.classList.remove('show')
    }

   // Show the signup button that's already in HTML
   const signupBtn = navbarContainer.querySelector('.nav-signup-btn');
   if (signupBtn) {
       signupBtn.classList.add('show');
   }
}

const navLinks = document.querySelectorAll('.nav-link');
const dropdownItems = document.querySelectorAll('.dropdown-item');

async function setupGlobalEventListeners(){
    const STORAGE_KEY = 'activeNavLinkPath';

    const savedPath = localStorage.getItem(STORAGE_KEY);
    const currentPath = window.location.pathname;

    dropdownItems.forEach(item => {
        item.addEventListener('click', function() {
            const path = this.getAttribute('href');
            if (path !== '#') {
                localStorage.setItem(STORAGE_KEY, path);
                activateLinkByPath(path);
            }
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const path = this.getAttribute('href');
            if (path !== '#') {
                localStorage.setItem(STORAGE_KEY, path);
                activateLinkByPath(path);
            }
        });
    });

    if (currentPath !== '/') {
        activateLinkByPath(currentPath);
        localStorage.setItem(STORAGE_KEY, currentPath);
    } else if (savedPath && savedPath !== '#') {
        activateLinkByPath(savedPath);
    }

    // Sidebar Navigation JavaScript
	const hamburgerMenu = document.querySelector('.hamburger-menu');
	const sidebarNav = document.querySelector('.sidebar-nav');
	const sidebarOverlay = document.querySelector('.sidebar-overlay');
	const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');
	const sidebarMenuLinks = document.querySelectorAll('.sidebar-menu-link');

	// Open sidebar
	hamburgerMenu.addEventListener('click', () => {
		sidebarNav.classList.add('active');
		sidebarOverlay.classList.add('active');
		document.body.classList.add('sidebar-open');
	});

	// Close sidebar
	function closeSidebar() {
		sidebarNav.classList.remove('active');
		sidebarOverlay.classList.remove('active');
		document.body.classList.remove('sidebar-open');

        const favoritesDropdown = document.getElementById('favorites-dropdown');
        const userProfileDropdown = document.getElementById('user-profile-dropdown');
        
        // Close dropdowns if open
        if (favoritesDropdown) favoritesDropdown.classList.remove('active');
        if (userProfileDropdown) userProfileDropdown.classList.remove('active');
        document.body.classList.remove('dropdown-open');
        }

        sidebarCloseBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);

        // Toggle submenus
        sidebarMenuLinks.forEach(link => {
            // Skip single links without submenus
            if (link.classList.contains('sidebar-single-link')) {
                return;
            }

            link.addEventListener('click', () => {
                const submenu = link.nextElementSibling;
                
                // Toggle current submenu
                link.classList.toggle('active');
                
                if (submenu && submenu.classList.contains('sidebar-submenu')) {
                    submenu.classList.toggle('active');
                }
                
                // Close other submenus (optional - remove if you want multiple open)
                sidebarMenuLinks.forEach(otherLink => {
                    if (otherLink !== link && !otherLink.classList.contains('sidebar-single-link')) {
                        otherLink.classList.remove('active');
                        const otherSubmenu = otherLink.nextElementSibling;
                        if (otherSubmenu && otherSubmenu.classList.contains('sidebar-submenu')) {
                            otherSubmenu.classList.remove('active');
                        }
                    }
                });
            });
        });
}

function setupDropdownListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    const favoritesBtn = document.getElementById('favorites-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const favoritesDropdown = document.getElementById('favorites-dropdown');
    const userProfileDropdown = document.getElementById('user-profile-dropdown');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const mobileCloseButtons = document.querySelectorAll('.mobile-dropdown-close');

    // Logout functionality
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        logOutUser();
    });

    // Check if mobile view function
    function checkMobileView() {
        return window.innerWidth <= 1024;
    }

    // Favorites button click handler
    favoritesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (checkMobileView()) {
            // Mobile: Toggle dropdown
            const isActive = favoritesDropdown.classList.contains('active');
            
            // Close user dropdown
            userProfileDropdown.classList.remove('active');
            
            // Toggle favorites dropdown
            favoritesDropdown.classList.toggle('active');
            sidebarOverlay.classList.toggle('active', !isActive);
            document.body.classList.toggle('dropdown-open', !isActive);
        } else {
            window.location.href = "/frontend/user/user-favorites.html";
        }
    });

    // User profile button click handler
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (checkMobileView()) {
            // Mobile: Toggle dropdown
            const isActive = userProfileDropdown.classList.contains('active');
            
            // Close favorites dropdown
            favoritesDropdown.classList.remove('active');
            
            // Toggle user dropdown
            userProfileDropdown.classList.toggle('active');
            sidebarOverlay.classList.toggle('active', !isActive);
            document.body.classList.toggle('dropdown-open', !isActive);
        }
    });

    // Close buttons
    mobileCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            favoritesDropdown.classList.remove('active');
            userProfileDropdown.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('dropdown-open');
        });
    });

    // // Overlay click - close dropdowns
    // sidebarOverlay.addEventListener('click', () => {
    //     // Only close dropdowns if they're open (not sidebar)
    //     if (favoritesDropdown.classList.contains('active') || userProfileDropdown.classList.contains('active')) {
    //         favoritesDropdown.classList.remove('active');
    //         userProfileDropdown.classList.remove('active');
    //         sidebarOverlay.classList.remove('active');
    //         document.body.classList.remove('dropdown-open');
    //     }
    // });

    // Close dropdowns when window is resized to desktop
    window.addEventListener('resize', () => {
        if (!checkMobileView()) {
            favoritesDropdown.classList.remove('active');
            userProfileDropdown.classList.remove('active');
            if (!document.querySelector('.sidebar-nav').classList.contains('active')) {
                sidebarOverlay.classList.remove('active');
                document.body.classList.remove('dropdown-open');
            }
        }
    });
}

function activateLinkByPath(path) {
	if (path === '#' || !path) return;

	navLinks.forEach(link => link.classList.remove('active'));
	
	navLinks.forEach(link => {
		if (link.getAttribute('href') === path) {
			link.classList.add('active');
		}
	});

	dropdownItems.forEach(item => {
		if (item.getAttribute('href') === path) {
			const parentNav = item.closest('.nav-link-item')?.querySelector('.nav-link');
			if (parentNav) {
				parentNav.classList.add('active');
			}
		}
	});
}

async function loadFavoritesMini(){
    try{
        const favRes = await fetch('/api/favorites', { credentials: "include" });

        if(!favRes.ok){
            throw new Error('Failed to load favorites')
        }

        const favorites = await favRes.json();
    
        const dropdownContent = document.getElementById("favorites-dropdown-content");
        dropdownContent.innerHTML = "";
    
        if (favorites.data.length === 0) {
            dropdownContent.innerHTML =
                `
                    <div class="favorite-empty-alert" id="empty-alert">
                        <i class="fas fa-info-circle"></i> No saved property yet.
                    </div>
                `
            return;
        };

        const limitedFavorites = favorites.data.slice(0, 2);
    
        for (const property of limitedFavorites) {
            const propertyImageRes = await fetch(`/public/properties/${property.property_id}/images`, {
                credentials: "include",
            });
    
            const images = await propertyImageRes.json();
    
            const primaryImage = images.find(img => img.is_primary)?.image_url || "/images/properties-backup.jpeg";
    
            const favoriteMini = document.createElement("div");

            favoriteMini.classList.add('favorite-mini')
            favoriteMini.innerHTML = `
                <img src="${primaryImage}" alt="Property-Image" class="favorite-mini-image">
                <div class="favorite-mini-info">
                    <div class="favorite-mini-price">$${Math.round(property.price).toLocaleString()}</div>
                    <div class="favorite-mini-address">${escapeHtml(property.address)}</div>
                </div>
            `;

            dropdownContent.appendChild(favoriteMini)

            favoriteMini.addEventListener('click', () => {
                window.location.href = `/frontend/guest/property.html?id=${property.property_id}`
            })
        };
    }catch (error) {
        console.error("Error loading properties:", error);
        dropdownContent.innerHTML = `
            <div class="alert favorite-empty-alert">
                <i class="fas fa-exclamation-circle"></i> Failed to load favorites. Please try again later.
            </div>
        `;
    }
}

async function loadSearchesMini(){
    try{
        const favRes = await fetch('/api/saved-searches', { credentials: "include" });

        if(!favRes.ok){
            throw new Error('Failed to load saved search')
        }

        const savedSearch = await favRes.json();
    
        const dropdownContent = document.getElementById("ss-dropdown-content");
        dropdownContent.innerHTML = "";
    
        if (savedSearch.data.length === 0) {
            dropdownContent.innerHTML =
                `
                    <div class="favorite-empty-alert" id="empty-alert">
                        <i class="fas fa-info-circle"></i> No saved search yet.
                    </div>
                `
            return;
        };
    
        const limitedSearches = savedSearch.data.slice(0, 2);

        for (const search of limitedSearches) {
    
            const filters = JSON.parse(search.filters)
            const searchMini = document.createElement("div");

            searchMini.classList.add('ss-mini')
            searchMini.innerHTML = `
                <i class="bi bi-search ss-mini-icon"></i>
                <div class="ss-mini-info">
                    <div class="ss-mini-filter">${escapeHtml(filters.search)}</div>
                    <div class="ss-mini-category">${escapeHtml(search.category)}</div>
                </div>
            `;

            dropdownContent.appendChild(searchMini)

            const ssMiniInfo = searchMini.querySelector('.ss-mini-info');
            ssMiniInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                runSavedSearch(search);
            });
        };
    }catch (error) {
        console.error("Error loading properties:", error);
        dropdownContent.innerHTML = `
            <div class="alert favorite-empty-alert">
                <i class="fas fa-exclamation-circle"></i> Failed to load saved searches. Please try again later.
            </div>
        `;
    }
}

function runSavedSearch(search) {
    const filters = JSON.parse(search.filters);
    const category = search.category.toLowerCase(); // 'sale', 'rent', or 'sold'
    
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

async function logOutUser(){
    const confirmed = await showConfirmation(
        "Are you sure you want to log out",
        "Confirm Logout",
        {
            confirmText: "Log out",
            cancelText: "Cancel",
            danger: true,
        }
    );

    if(!confirmed){
        return
    };

    try {
        const response = await fetch("/auth/logout",
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "x-csrf-token": window.getCsrfToken(),
                },
            }
        );

        if (!response.ok) throw new Error("Log out failed");

        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        window.location.replace("/frontend/guest/index.html");

    } catch (error) {
        console.error("Logout failed:", error);
        showToast(data.message, "error");
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

function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, s => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	}[s]));
}

window.loadFavoritesMini = loadFavoritesMini
window.loadSearchesMini = loadSearchesMini