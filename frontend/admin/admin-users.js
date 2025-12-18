document.addEventListener('DOMContentLoaded', async () => {

    const API_BASE = '/admin'
    const countrySelect = document.querySelector('.country-select')
    countrySelect.innerHTML = `<option selected disabled>Select Country</option>`

    try {
        const response = await fetch('/public/countries')
        const countries = await response.json()

        countries.forEach((country) => {
            const option = document.createElement('option')
            option.value = country
            option.textContent = country
            countrySelect.appendChild(option)
        })
    }catch(error){
        console.error('Error:', error)
    }

    const form = document.getElementById("userForm");
    const userModal = document.querySelector('.user-modal')
    const closeModalIcon = document.querySelector(".close-modal-icon");
    const modalOverlay = document.querySelector(".modal-overlay");
    const cancelFormBtn = document.querySelector(".cancel-form-btn");
    let userId = null;

    const escapeHtml = str =>
        String(str).replace(/[&<>"']/g, s => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[s]));


    async function loadUsers(page) {
        try {
            const search = document.getElementById("searchInput").value.trim();
            const role = document.getElementById("users-role-filter").value;
            const gender = document.getElementById("users-gender-filter").value;

            const params = new URLSearchParams({
                page: page || 1,
                limit: 20,
            });

            if (search) params.append("q", search);
            if (role && role !== "all") params.append("role", role);
            if (gender && gender !== "all") params.append("gender", gender);

            const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
                credentials: "include",
            });

            const data = await res.json();

            if (data.data.length === 0) {
                document.getElementById("empty-alert").style.display = "block";
                document.getElementById("users-table").style.display = "none";
                return;
            }

            document.getElementById("empty-alert").style.display = "none";
            document.getElementById("users-table").style.display = "block";

            const tbody = document.getElementById("users-table-body");
            tbody.innerHTML = "";

            data.data.forEach(user => {
                const deactivatedAt = user.deactivated_at ? new Date(user.deactivated_at).toLocaleString() : null
                const suspendedAt = user.suspended_at ? new Date(user.suspended_at).toLocaleString() : null
                const deletedAt = user.deleted_at ? new Date(user.deleted_at).toLocaleString() : null
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${escapeHtml(user.id)}</td>
                    <td>${escapeHtml(user.first_name)}</td>
                    <td>${escapeHtml(user.last_name)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(user.role)}</td>
                    <td>${escapeHtml(user.phone)}</td>
                    <td>${escapeHtml(user.gender)}</td>
                    <td>${escapeHtml(user.country)}</td>
                    <td>${escapeHtml(user.email_verified)}</td>
                    <td>${escapeHtml(user.last_verification_sent)}</td>
                    <td>${escapeHtml(user.verification_token)}</td>
                    <td>${escapeHtml(user.verification_token_expires)}</td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                    <td>${new Date(user.updated_at).toLocaleString()}</td>
                    <td>${escapeHtml(deactivatedAt)}</td>
                    <td>${escapeHtml(suspendedAt)}</td>
                    <td>${escapeHtml(deletedAt)}</td>
                    <td>
                        <div class="table-action-btns">
                            <button class="table-action-btn edit edit-user-btn" data-id="${user.id}">
                                <i class="fas fa-edit"></i>Edit
                            </button>
                            <button class="table-action-btn view view-user-btn" data-id="${user.id}">
                                <i class="fas fa-plus"></i>View
                            </button>
                            <button class="table-action-btn delete delete-user-btn" data-id="${user.id}">
                                <i class="fas fa-trash"></i>Delete
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            })

            renderPagination(data.meta);

        } catch (error) {
            console.error("Error loading users:", error);
        }

        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                userId = e.target.dataset.id;
                userModal.classList.add('show');
                modalOverlay.classList.add('show');
                document.body.style.overflow = 'hidden';
                await loadUserData(userId);
            });
        });

        document.querySelectorAll('.view-user-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                userId = e.target.dataset.id;
                console.log(userId)
                window.location.href = `/frontend/admin/admin-user-overview.html?id=${userId}`
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                userId = e.target.dataset.id;
                await deleteUser(userId);
            });
        });
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

    const debouncedSearch = debounce(() => loadUsers(1), 400);

    document.getElementById("searchInput").addEventListener("input", debouncedSearch);
    document.getElementById("users-role-filter").addEventListener("change", () => loadUsers(1));
    document.getElementById("users-gender-filter").addEventListener("change", () => loadUsers(1));

    function renderPagination(meta) {
        const container = document.getElementById("pagination");
        if (!container) return;
        
        container.innerHTML = "";
        
        // Previous button
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "‹";
        prevBtn.disabled = meta.page === 1;
        prevBtn.addEventListener("click", () => loadUsers(meta.page - 1));
        container.appendChild(prevBtn);
        
        // Page numbers
        for (let i = 1; i <= meta.totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.disabled = i === meta.page;
            btn.addEventListener("click", () => loadUsers(i));
            container.appendChild(btn);
        }
        
        // Next button
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "›";
        nextBtn.disabled = meta.page === meta.totalPages;
        nextBtn.addEventListener("click", () => loadUsers(meta.page + 1));
        container.appendChild(nextBtn);
    }
        
    async function loadUserData(userId) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}`, {
                credentials: "include"
            });

            if (!response.ok) {
                showToast("User not found", "error");
                return;
            }

            const user = await response.json();

            // Populate form fields
            document.getElementById("first-name").value = user.first_name || "";
            document.getElementById("last-name").value = user.last_name || "";
            document.getElementById("email").value = user.email || "";
            document.getElementById("role").value = user.role || "";
            document.getElementById("phone").value = user.phone || "";
            document.getElementById("gender").value = user.gender || "";
            document.getElementById("country").value = user.country || "";

        } catch (error) {
            console.error("Error loading user:", error);
            showToast("Failed to load user data", "error");
        }
    }

    async function deleteUser(userId) {
        const confirmed = await showConfirmation(
            "Are you sure you want to delete this user?",
            "Delete user",
            {
                confirmText: "Continue",
                cancelText: "Cancel",
                danger: true,
            }
        );

        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE}/users/${userId}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "x-csrf-token": window.getCsrfToken(),
                },
            });

            const data = await res.json();
            reloadWithToast(data.message, "success", );
        } catch (err) {
            console.error("Error deleting user:", err);
        }
    }

    // Close modal function
    function closeModal() {
        userModal.classList.remove('show');
        modalOverlay.classList.remove('show');
        document.body.style.overflow = '';
        form.reset();
    }

    closeModalIcon.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', closeModal);

    cancelFormBtn.addEventListener('click', closeModal);

    // Prevent closing when clicking inside modal
   userModal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());

        for (const key in userData) {
            if (userData[key] === "") {
                userData[key] = null;
            }
        }

        // const requiredFields = ["first_name", "last_name", "email", "role", "gender", "country"];
        // const missingField = requiredFields.some(field => !propertyData[field]);

        // if (missingField) {
        //     showToast("Please fill in all required fields", "info");
        //     return;
        // }

        submitBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-csrf-token": window.getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (response.ok) {
                reloadWithToast(result.message, 'success');
                console.log("User Updated!")
                
                submitBtn.textContent = "Updating user...";
                closeModal();
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("Failed", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Update user";
        }
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        location.reload();
    })

    // Call this when the page loads
    loadUsers();


    // Export functionality
	function exportData(format) {
		const search = document.getElementById("searchInput").value.trim();
		const role = document.getElementById("users-role-filter").value;
		const gender = document.getElementById("users-gender-filter").value;

		const params = new URLSearchParams({ format });

		if (search) params.append("q", search);
		if (gender && gender !== "all") params.append("gender", gender);
		if (role && role !== "all") params.append("role", role);

		// Use window.location.href for direct download
		window.location.href = `/admin/users/export?${params.toString()}`;
	}

	// Add event listeners for export buttons
	document.getElementById('exportCsv').addEventListener('click', () => {
		exportData('csv');
	});

	document.getElementById('exportPdf').addEventListener('click', () => {
		exportData('pdf');
	});
});