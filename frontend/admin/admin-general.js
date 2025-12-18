document.addEventListener('DOMContentLoaded', () => {
    const originalFetch = window.fetch;
	window.fetch = function (...args) {
		return originalFetch(...args).then((response) => {
			if (response.status === 403) {
				// Clear cookie and redirect to login
				document.cookie =
					"authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
				window.location.href = "/frontend/guest/index.html"; // Adjust to your login page path
			}
			return response;
		});
	};

    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.admin-nav-link');
    
    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Add active class to the link that matches current page
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });



    // window.addEventListener("click", (e) => {
	// 	if (e.target === modal) modal.style.display = "none";
	// });
});

// const hamburgerBtn = document.getElementById("hamburger-btn");
// const sidebar = document.querySelector(".sidebar");
// const overlay = document.getElementById("sidebar-overlay");

// if (hamburgerBtn && sidebar && overlay) {
//     // Toggle menu on hamburger click
//     hamburgerBtn.addEventListener("click", (e) => {
//         e.stopPropagation();
//         hamburgerBtn.classList.toggle("active");
//         sidebar.classList.toggle("active");
//         overlay.classList.toggle("active");
//     });

//     // Close menu when clicking overlay
//     overlay.addEventListener("click", () => {
//         hamburgerBtn.classList.remove("active");
//         sidebar.classList.remove("active");
//         overlay.classList.remove("active");
//     });

//     // Close menu when clicking a sidebar link
//     const sidebarLinks = document.querySelectorAll(".sidebar a");
//     sidebarLinks.forEach((link) => {
//         link.addEventListener("click", () => {
//             hamburgerBtn.classList.remove("active");
//             sidebar.classList.remove("active");
//             overlay.classList.remove("active");
//         });
//     });

//     // Close menu when clicking outside
//     document.addEventListener("click", (e) => {
//         const isClickInsideSidebar = sidebar.contains(e.target);
//         const isClickOnHamburger = hamburgerBtn.contains(e.target);

//         if (
//             !isClickInsideSidebar &&
//             !isClickOnHamburger &&
//             sidebar.classList.contains("active")
//         ) {
//             hamburgerBtn.classList.remove("active");
//             sidebar.classList.remove("active");
//             overlay.classList.remove("active");
//         }
//     });
// }

	// Logout functionality
	const logoutBtn = document.getElementById("adminLogoutBtn");

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
    
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
    
            // const data = await response.json()
    
            if (!response.ok) throw new Error("Log out failed");
    
            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
            window.location.replace("/frontend/guest/index.html");
    
        } catch (error) {
            console.error("Logout failed:", error);
            showToast(data.message, "error");
        }
    });

// // Check super admin status
// (function () {
//     const isSuperAdmin = sessionStorage.getItem("isSuperAdmin");
//     if (isSuperAdmin === "true") {
//         document.body.classList.add("super-admin");
//     }

//     fetch(`/auth/me`, { credentials: "include" })
//         .then((res) => res.json())
//         .then((user) => {
//             console.log("User role:", user.role);
//             if (user.role === "super_admin") {
//                 sessionStorage.setItem("isSuperAdmin", "true");
//                 document.body.classList.add("super-admin");
//             } else {
//                 sessionStorage.setItem("isSuperAdmin", "false");
//                 document.body.classList.remove("super-admin");
//             }
//         })
//         .catch((err) => console.error("Failed to check user role:", err));
// })();