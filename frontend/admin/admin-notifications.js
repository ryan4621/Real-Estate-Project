// admin-notifications.js

const API_BASE = `/admin`;

let currentPage = 1;
const limit = 10;
let currentFilters = {
    search: "",
    notificationStatus: "all",
    notificationCategory: "all",
};
let notifications = [];
let stats = {};
let editNotificationId;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
	setupEventListeners();
	loadStats();
	loadNotifications();
});

// Setup event listeners
function setupEventListeners() {

	const debouncedSearch = debounce(() => loadNotifications(1), 400);
    document.getElementById("searchInput").addEventListener("input", debouncedSearch);
    document.getElementById("notifications-status-filter").addEventListener("change", () => loadNotifications(1));
    document.getElementById("notifications-category-filter").addEventListener("change", () => loadNotifications(1));

    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', () => exportData('csv'));
    document.getElementById('exportPdf').addEventListener('click', () => exportData('pdf'));

	// Main action buttons
	document.getElementById("notification-create-btn").addEventListener("click", showCreateForm);
	document.getElementById("notification-refresh-btn").addEventListener("click", () => refreshData());

	// Form controls
	document.getElementById("notification-cancel-btn").addEventListener("click", hideCreateForm);
	document.getElementById("notification-draft-btn").addEventListener("click", handleDraftSubmit);
	document.getElementById("notification-form").addEventListener("submit", handleFormSubmit);

	// Target audience checkbox logic
	document.getElementById("notification-target-all").addEventListener("change", (e) => {
		const userRolesSelect = document.getElementById("notification-user-roles");
		userRolesSelect.disabled = e.target.checked;
		if (e.target.checked) {
			userRolesSelect.value = "";
		}
	});

	// Modal controls
	document.getElementById("notification-modal-close").addEventListener("click", closeNotificationModal);
	document.getElementById("notification-modal").addEventListener("click", (e) => {
		if (e.target.id === "notification-modal") {
			closeNotificationModal();
		}
	});
}

// Load notification statistics
async function loadStats() {
	try {
		const response = await fetch(`${API_BASE}/notifications/statistics`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const data = await response.json();
		stats = data.data;
		updateStatsDisplay();
	} catch (error) {
		console.error("Failed to load notification statistics:", error);
		showToast("Failed to load statistics", "error");
	}
}

// Update statistics display
function updateStatsDisplay() {
	const { overall, engagement } = stats;

	if (!overall) return;

	document.getElementById("sent-notifications-count").textContent = overall.sent_notifications || 0;
	document.getElementById("draft-notifications-count").textContent = overall.draft_notifications || 0;
	document.getElementById("total-recipients-count").textContent = overall.total_recipients_reached || 0;

	// Calculate read rate percentage
	const readRate =
		engagement && engagement.total_user_notifications > 0
			? Math.round((engagement.read_notifications / engagement.total_user_notifications) * 100)
			: 0;
	document.getElementById("read-rate-percentage").textContent = `${readRate}%`;
}

// Load notifications
async function loadNotifications(page) {
	showLoadingState();
	applyFilters()

	try {

        if (page) currentPage = page;

		const params = new URLSearchParams({
			limit: limit,
			page: currentPage,
			sortBy: "created_at",
			sortOrder: "DESC",
		});

		if (currentFilters.search) params.append("q", currentFilters.search);
        if (currentFilters.notificationStatus && currentFilters.notificationStatus !== "all") params.append("status", currentFilters.notificationStatus);
        if (currentFilters.notificationCategory && currentFilters.notificationCategory !== "all") params.append("category", currentFilters.notificationCategory);

		const response = await fetch(`${API_BASE}/notifications?${params}`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const data = await response.json();
		notifications = data.data;

		renderPagination(data.meta);
		renderNotifications();
	} catch (error) {
		console.error("Failed to load notifications:", error);
		showErrorState("Failed to load notifications");
	}
}

function applyFilters() {
    currentFilters = {
        search: document.getElementById("searchInput").value.trim(),
        notificationStatus: document.getElementById("notifications-status-filter").value,
        notificationCategory: document.getElementById("notifications-category-filter").value,
    };
}

// Render pagination controls
function renderPagination(meta) {
    const container = document.getElementById("pagination");
    if (!container) return;

    container.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "‹";
    prevBtn.disabled = meta.page === 1;
    prevBtn.addEventListener("click", () => loadNotifications(meta.page - 1));
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= meta.totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i === meta.page;
        btn.addEventListener("click", () => loadNotifications(i));
        container.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "›";
    nextBtn.disabled = meta.page === meta.totalPages;
    nextBtn.addEventListener("click", () => loadNotifications(meta.page + 1));
    container.appendChild(nextBtn);
}

// Show loading state
function showLoadingState() {
	document.getElementById("notification-loading-state").style.display = "block";
	document.getElementById("notification-empty-state").style.display = "none";
	document.getElementById("notification-table").style.display = "none";
}

// Show error state
function showErrorState(message) {
	document.getElementById("notification-loading-state").style.display = "none";
	document.getElementById("notification-empty-state").style.display = "block";
	document.getElementById("notification-table").style.display = "none";

	const emptyState = document.getElementById("notification-empty-state");
	emptyState.innerHTML = `
		<div class="notification-empty-icon">⚠️</div>
		<h3>Error Loading Notifications</h3>
		<p>${escapeHtml(message)}</p>
		<button class="notification-btn notification-btn-primary" id="try-again-btn" \>
			Try Again
		</button>
	`;
}

// Render notifications
function renderNotifications() {
	const tbody = document.getElementById("notification-table-body");

	if (notifications.length === 0) {
		document.getElementById("notification-loading-state").style.display = "none";
		document.getElementById("notification-empty-state").style.display = "block";
		document.getElementById("notification-table").style.display = "none";
		return;
	}

	document.getElementById("notification-loading-state").style.display = "none";
	document.getElementById("notification-empty-state").style.display = "none";
	document.getElementById("notification-table").style.display = "table";

	tbody.innerHTML = notifications.map((notification) => renderNotificationRow(notification)).join("");

	attachTableEventListeners()

	// Update notification count
	document.getElementById("notification-list-count").textContent = `${notifications.length} notifications`;
}

// Render notification row
function renderNotificationRow(notification) {
	const createdDate = new Date(notification.created_at).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return `
		<tr>
			<td>
				<div>
					<strong>${escapeHtml(notification.title)}</strong><br>
					<small style="color: #7f8c8d;">${truncateText(escapeHtml(notification.message), 60)}</small>
				</div>
			</td>
			<td>
				<span class="notification-category-badge notification-category-${escapeHtml(notification.category).replace("_", "-")}">
					${formatCategory(escapeHtml(notification.category))}
				</span>
			</td>
			<td>
				<span class="notification-status-badge notification-status-${escapeHtml(notification.status)}">
					${escapeHtml(notification.status)}
				</span>
			</td>
			<td>${notification.total_recipients || 0}</td>
			<td>${createdDate}</td>
			<td>
				<div class="notification-actions-cell">
					<button class="notification-action-btn notification-action-view" 
							data-id="${notification.id}"
							title="View Details">
						<i class="fa-solid fa-eye"></i>
					</button>
					${
						notification.status === "draft"
							? `
						<button class="notification-action-btn notification-action-edit" 
								data-id="${notification.id}"
								title="Edit notification">
							<i class="bi bi-inbox-fill"></i>
						</button>
					`
							: ""
					}
					<button class="notification-action-btn notification-action-delete" 
							data-id="${notification.id}"
							title="Delete">
						<i class="bi bi-trash3-fill"></i>
					</button>
				</div>
			</td>
		</tr>
	`;
}

function attachTableEventListeners(){
	let notificationId;

	document.querySelectorAll('.notification-action-edit').forEach(btn => {
		btn.addEventListener('click', (e) => {
			console.log('clicked')
            notificationId = e.target.closest('button').dataset.id;
			editDraftedNotification(notificationId)
		})
	})

	document.querySelectorAll('.notification-action-view').forEach(btn => {
		btn.addEventListener('click', (e) => {
			console.log("View notification clicked!")
            notificationId = e.target.closest('button').dataset.id;
			viewNotification(notificationId)
		})
	})

	document.querySelectorAll('.notification-action-delete').forEach(btn => {
		btn.addEventListener('click', (e) => {
			console.log("View notification clicked!")
            notificationId = e.target.closest('button').dataset.id;
			deleteNotification(notificationId)
		})
	})

	const retryBtn = document.getElementById('try-again-btn');
	if (retryBtn) {
		retryBtn.addEventListener('click', () => refreshData());
	}
}

// Format category
function formatCategory(category) {
	const categories = {
		marketing_emails: "Marketing",
		saved_listings: "Listings",
		general: "General",
	};
	return categories[category] || category;
}

// Truncate text
function truncateText(text, length) {
	return text.length > length ? text.substring(0, length) + "..." : text;
}

// Show create form
function showCreateForm() {
	document.getElementById("notification-create-form").classList.add("show");
	document.getElementById("notification-title").focus();
}

// Hide create form
function hideCreateForm() {
	document.getElementById("notification-create-form").classList.remove("show");
	document.getElementById("notification-form").reset();
	document.getElementById("notification-user-roles").disabled = true;
	editNotificationId = null
}

// Handle form submission
async function handleFormSubmit(e) {
	e.preventDefault();

	try {
		const formData = collectFormData();

        const { title, message, category } = formData

        if(!title || !message || !category){
            showToast("Fill all fields before sending notification", "error")
            return
        }

		setFormLoadingState(true);

		const url = editNotificationId
		? `${API_BASE}/notifications/draft/send/${editNotificationId}`
		: `${API_BASE}/notifications`

		const method = editNotificationId ? 'PUT' : 'POST'

		const response = await fetch(url, {
			method: method,
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken(),
			},
			credentials: "include",
			body: JSON.stringify(formData),
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.message || "Failed to create notification");
		}

        console.log('Notification sent')

		const resultMessage = editNotificationId 
		? "Notification updated and sent successfully"
		: "Notification created and sent successfully"

		showToast(resultMessage, "success");
		hideCreateForm();
		refreshData(false);
	} catch (error) {
		console.error("Failed to create notification:", error);
		showToast("Failed to create notification", "error");
	} finally {
		setFormLoadingState(false);
	}
}

// Collect form data
function collectFormData() {
	const targetAll = document.getElementById("notification-target-all").checked;
	const userRolesSelect = document.getElementById("notification-user-roles");

	const userRoles = targetAll
		? null
		: Array.from(userRolesSelect.selectedOptions)
			.map((option) => option.value)
			.filter((value) => value);

	const formData = {
		title: document.getElementById("notification-title").value.trim(),
		message: document.getElementById("notification-message").value.trim(),
		category: document.getElementById("notification-category").value,
		target_all_users: targetAll
	};

	if (!targetAll && userRoles && userRoles.length > 0) {
		formData.target_user_roles = userRoles;
	}

    console.log(formData)

	return formData;
}

async function handleDraftSubmit(e){
	e.preventDefault()

	const formData = collectFormData()

	const { title, category, message } = formData

	if(!title || !category || !message){
		showToast("Please fill all fields before drafting", "error")
		return
	}

	setFormLoadingState(true);

	try {
		const response = await fetch(`${API_BASE}/notifications/draft`, {
			method: 'POST',
			headers: {
				"Content-type": "application/json",
				"x-csrf-token": window.getCsrfToken()
			},
			credentials: "include",
			body: JSON.stringify(formData)
		})

		const result = await response.json()

		if(!response.ok){
			throw new Error(result.message || "Error drafting notification")
		}

		showToast("Notification drafted successfully!", "success");
		hideCreateForm();
		refreshData(false);

	}catch(error){
		console.log(error.message)
		showToast('Error saving notitication to draft', 'error')
	}finally {
		setFormLoadingState(false);
	}
}

// Set form loading state
function setFormLoadingState(isLoading) {
	const submitBtn = document.querySelector('#notification-form button[type="submit"]');
	const cancelBtn = document.getElementById("notification-cancel-btn");

	submitBtn.disabled = isLoading;
	cancelBtn.disabled = isLoading;

	if (isLoading) {
		submitBtn.textContent = "Sending...";
	} else {
		submitBtn.textContent = "Send Notification";
	}
}

// View notification details
async function viewNotification(notificationId) {
	showNotificationModal();
	showModalLoading();

	try {
		const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const notification = await response.json();
		renderNotificationDetails(notification);
	} catch (error) {
		console.error("Failed to load notification details:", error);
		showModalError("Failed to load notification details");
	}
}

// Render notification details
function renderNotificationDetails(notification) {
	document.getElementById("notification-modal-title").textContent = `Notification #${notification.id} - Details`;

	const createdDate = new Date(notification.created_at).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const sentDate = notification.sent_at
		? new Date(notification.sent_at).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
		})
		: "Not sent";

	document.getElementById("notification-modal-body").innerHTML = `
		<div style="display: grid; gap: 1.5rem;">
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
				<div>
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Notification Information</h4>
					<p><strong>Title:</strong> ${escapeHtml(notification.title)}</p>
					<p><strong>Category:</strong> 
					${escapeHtml(notification.message).replace(/\n/g, "<br>")}
						<span class="notification-category-badge notification-category-${escapeHtml(notification.category).replace("_", "-")}">
							${formatCategory(escapeHtml(notification.category))}
						</span>
					</p>
					<p><strong>Status:</strong> 
						<span class="notification-status-badge notification-status-${escapeHtml(notification.status)}">
							${escapeHtml(notification.status)}
						</span>
					</p>
				</div>
				<div>
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Delivery Information</h4>
					<p><strong>Total Recipients:</strong> ${notification.total_recipients || 0}</p>
				</div>
			</div>
			
			<div>
				<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Message</h4>
				<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #3498db;">
					${escapeHtml(notification.message).replace(/\n/g, "<br>")}
				</div>
			</div>

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; color: #7f8c8d;">
				<p><strong>Created:</strong> ${createdDate}</p>
				<p><strong>Sent:</strong> ${sentDate}</p>
				<p><strong>Created by:</strong> ${escapeHtml(notification.created_by_first_name)} ${escapeHtml(notification.created_by_last_name)}</p>
			</div>

			<div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
				<button class="notification-btn notification-btn-secondary" id="close-notification-details">
					Close
				</button>
			</div>
		</div>
	`;

	document.getElementById('close-notification-details').addEventListener('click', closeNotificationModal);
}

async function editDraftedNotification(notificationId){
	showCreateForm();

	try {
		const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
			credentials: "include",
		});

		const data = await response.json()

		editNotificationId = notificationId

		if (!response.ok) {
			throw new Error(data.message || 'Error fetching notification details');
		}

		document.getElementById("notification-title").value = data.title || ''
		document.getElementById("notification-message").value = data.message || ''
		document.getElementById("notification-category").value = data.category || ''
		document.getElementById("notification-target-all").checked = data.target_all_users;


		const userRolesSelect = document.getElementById("notification-user-roles");
    
		if (data.target_all_users) {
			// If targeting all users, disable the roles select
			userRolesSelect.disabled = true;
			userRolesSelect.value = "";
		} else {
			// Enable the roles select
			userRolesSelect.disabled = false;
			
			// Parse JSON string back to array if needed
			let roles = data.target_user_roles;
			if (typeof roles === 'string') {
				try {
					roles = JSON.parse(roles);
				} catch (e) {
					console.error('Failed to parse target_user_roles:', e);
					roles = [];
				}
			}
			
			// Select the appropriate options in the multi-select
			Array.from(userRolesSelect.options).forEach(option => {
				option.selected = roles && roles.includes(option.value);
			});
		}

	} catch (error) {
		console.error("Failed to load notification details:", error);
		showModalError("Failed to load notification details");
	}
}

// Delete notification
async function deleteNotification(notificationId) {
	const confirmed = await showConfirmation(
		"Are you sure you want to delete this notification? This action cannot be undone.",
		"Delete Notification",
		{
			confirmText: "Continue",
			cancelText: "Cancel",
			danger: true,
		}
	);

	if (!confirmed) {
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken(),
			},
		});

		if (!response.ok) {
			const result = await response.json();
			throw new Error(result.message || "Failed to delete notification");
		}

		showToast("Notification deleted successfully!", "success");
		refreshData(false);
	} catch (error) {
		console.error("Failed to delete notification:", error);
		showToast("Failed to delete notification", "error");
	}
}

// Show modal
function showNotificationModal() {
	document.getElementById("notification-modal").style.display = "block";
}

// Close modal
function closeNotificationModal() {
	document.getElementById("notification-modal").style.display = "none";
}

// Show modal loading state
function showModalLoading() {
	document.getElementById("notification-modal-body").innerHTML = `
		<div class="notification-loading">
			<div class="notification-loading-spinner"></div>
			<p>Loading notification details...</p>
		</div>
	`;
}

// Show modal error
function showModalError(message) {
	document.getElementById("notification-modal-body").innerHTML = `
		<div style="text-align: center; padding: 2rem; color: #7f8c8d;">
			<div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
			<h3>Error</h3>
			<p>${escapeHtml(message)}</p>
			<button class="notification-btn notification-btn-primary" id="close-notification-modal">
				Close
			</button>
		</div>
	`;

	document.getElementById('close-notification-modal').addEventListener('click', closeNotificationModal);
}

// Refresh data
function refreshData(showMessage = true) {
	loadStats();
	loadNotifications();
	if (showMessage) {
		showToast("Data refreshed successfully", "success");
	}
}

function exportData(format) {
    const search = document.getElementById("searchInput").value.trim();
    const notificationStatus = document.getElementById("notifications-status-filter").value;
    const notificationCategory = document.getElementById("notifications-category-filter").value;

    const params = new URLSearchParams({ format });

    if (search) params.append("q", search);
    if (notificationStatus && notificationStatus !== "all") params.append("status", notificationStatus);
    if (notificationCategory && notificationCategory !== "all") params.append("category", notificationCategory);

    window.location.href = `/admin/notifications/export?${params.toString()}`;
}

// Helper functions
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