//user-overview.js

let currentUser = null;
const apiBase = `/admin`;


// Load user data
async function loadUserData() {
    const URLParams = new URLSearchParams(window.location.search);
	const userId = URLParams.get("id");

	if (!userId) {
		showError("No user ID provided");
		return;
	}

	try {
		const response = await fetch(`${apiBase}/users/${userId}/overview`, {
			credentials: "include",
		});

		if (!response.ok) {
			throw new Error(`Failed to load user data: ${response.status}`);
		}

		const data = await response.json();
		currentUser = data;
		populateUserData(data);

		document.getElementById("loading").style.display = "none";
		document.getElementById("content").style.display = "block";
	} catch (error) {
		console.error("Error loading user data:", error);
		showError("Failed to load user data");
	}
}

// Populate the page with user data
function populateUserData(data) {
	const {
		user,
		preferences,
		sessions,
		supportTickets,
        inquiries,
		notifications,
		security,
		activity,
		addresses,
		stats,
	} = data;

	// Basic user info
    const userName = `${user.first_name} ${user.last_name}`
	document.getElementById("user-name").textContent = userName || "N/A";
	document.getElementById("user-email").textContent = user.email || "N/A";

	// ADD THIS: Display email verification badge
	const emailVerificationBadge = document.getElementById(
		"email-verification-badge"
	);
	if (user.email_verified) {
		emailVerificationBadge.innerHTML =
			'<span class="verification-badge verified">✓ Verified</span>';
	} else {
		emailVerificationBadge.innerHTML =
			'<span class="verification-badge not-verified">⚠ Not Verified</span>';
	}

	document.getElementById("user-phone").textContent = user.phone || "N/A";
	document.getElementById("user-location").textContent = user.country || "N/A";
	document.getElementById("user-role").textContent = user.role || "user";
	document.getElementById("user-gender").textContent = user.gender || "N/A";
	document.getElementById("user-country").textContent = user.country || "N/A";

	const profileImageElement = document.getElementById("profile-image");
	if (user.profile_image) {
		profileImageElement.src = user.profile_image;
	} else {
		profileImageElement.src =
			"https://i.pinimg.com/736x/5a/bd/98/5abd985735a8fd4adcb0e795de6a1005.jpg";
	}

	// Status
	const statusElement = document.getElementById("user-status");
	let statusText = "Active";
	let statusClass = "status-active";

	if (user.deleted_at) {
		statusText = "Deleted";
		statusClass = "status-deleted";
	} else if (user.suspended_at) {
		statusText = "Suspended";
		statusClass = "status-suspended";
	} else if (user.deactivated_at) {
		statusText = "Deactivated";
		statusClass = "status-inactive";
	}

	statusElement.textContent = statusText;
	statusElement.className = `status-badge ${statusClass}`;

	// Account info
	document.getElementById("inquiries-count").textContent = inquiries
	document.getElementById("date-joined").textContent = new Date(
		user.created_at
	).toLocaleString();
	document.getElementById("last-login").textContent = stats.lastLogin
		? new Date(stats.lastLogin).toLocaleString()
		: "Never";

	// Security
	// document.getElementById("two-fa-status").textContent =
	// 	security.two_factor_enabled ? "Enabled" : "Disabled";
	document.getElementById("active-sessions").textContent =
		stats.currentSessions || 0;
	document.getElementById("total-sessions").textContent =
		stats.totalSessions || 0;

	// Recent IPs
	const recentIpsElement = document.getElementById("recent-ips");
	recentIpsElement.innerHTML = "";
	const uniqueIps = [...new Set(sessions.slice(0, 5).map((s) => s.ip_address))];
	uniqueIps.forEach((ip) => {
		const li = document.createElement("li");
		li.textContent = ip || "Unknown";
		recentIpsElement.appendChild(li);
	});

	// Support tickets - Show ALL tickets, not just first 5
	document.getElementById("active-tickets").textContent =
		supportTickets.activeCount;
	document.getElementById("total-tickets").textContent =
		supportTickets.totalCount;

	if (supportTickets.tickets.length > 0) {
		const ticketsTable = document.getElementById("tickets-table");
		ticketsTable.innerHTML = "";

		// Show ALL tickets instead of limiting to 5
		supportTickets.tickets.forEach((ticket) => {
			const row = document.createElement("tr");
			row.innerHTML = `
            <td>#${ticket.id}</td>
            <td>${ticket.subject}</td>
            <td>${ticket.status}</td>
            <td>${ticket.priority}</td>
            <td>${new Date(ticket.created_at).toLocaleDateString()}</td>
          `;
			ticketsTable.appendChild(row);
		});

		document.querySelector("#tickets-table-container table").style.display = "table";
	}

	// Engagement
	// document.getElementById(
	// 	"notification-stats"
	// ).textContent = `${notifications.total_notifications} total, ${notifications.unread_notifications} unread`;
	// document.getElementById("address-count").textContent = addresses.length;

	// // Recent activity
	// const activityElement = document.getElementById("recent-activity");
	// activityElement.innerHTML = "";
	// activity.slice(0, 10).forEach((act) => {
	// 	const li = document.createElement("li");
	// 	li.innerHTML = `<strong>${act.activity_type}:</strong> ${
	// 		act.description
	// 	} <small>(${new Date(act.created_at).toLocaleString()})</small>`;
	// 	activityElement.appendChild(li);
	// });

	// Update status modal
	document.getElementById("current-status").textContent = statusText;
}

// Show error message
function showError(message) {
	document.getElementById("loading").style.display = "none";
	document.getElementById("error").style.display = "block";
	document.getElementById("error").textContent = message;
}

// Show status change modal
function showStatusModal() {
	document.getElementById("statusModal").style.display = "block";
}

// Show email modal
function showEmailModal() {
	document.getElementById("emailModal").style.display = "block";
}

// Close modal
function closeModal(modalId) {
	document.getElementById(modalId).style.display = "none";
}

// Change user status
async function changeUserStatus(action) {
	const confirmed = await showConfirmation(
		`Are you sure you want to ${action} this user?`,
		"Change user status",
		{
			confirmText: "Continue",
			cancelText: "Cancel",
		}
	);

	if (!confirmed) {
		return;
	}

	try {
		const response = await fetch(
			`${apiBase}/users/${currentUser.user.id}/status`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": window.getCsrfToken(),
				},
				credentials: "include",
				body: JSON.stringify({ action }),
			}
		);

		if (!response.ok) {
			throw new Error("Failed to change user status");
		}

		const result = await response.json();
		showToast(result.message, "success");
		closeModal("statusModal");
		loadUserData(); // Reload data
	} catch (error) {
		console.error("Error changing user status:", error);
		showToast("Failed to change user status: " + error.message, "error");
	}
}

// Reset password
async function resetPassword() {
	const confirmed = await showConfirmation(
		"Are you sure you want to reset this user's password?",
		"Reset user password",
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
		const response = await fetch(
			`${apiBase}/users/${currentUser.user.id}/reset-password`,
			{
				method: "POST",
				credentials: "include",
				headers: {
					"x-csrf-token": window.getCsrfToken(),
				},
			}
		);

		if (!response.ok) {
			throw new Error("Failed to reset password");
		}

		const result = await response.json();
		showToast(
			`Password reset successfully. Temporary password: ${result.tempPassword}`,
			"success"
		);
	} catch (error) {
		console.error("Error resetting password:", error);
		showToast("Failed to reset password", "error");
	}
}

// Send email to user
async function sendEmailToUser() {
	const subject = document.getElementById("email-subject").value;
	const message = document.getElementById("email-message").value;

	if (!subject || !message) {
		showToast("Please fill in both subject and message", "error");
		return;
	}

	try {
		const response = await fetch(
			`${apiBase}/users/${currentUser.user.id}/send-email`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": window.getCsrfToken(),
				},
				credentials: "include",
				body: JSON.stringify({ subject, message }),
			}
		);

		if (!response.ok) {
			throw new Error("Failed to send email");
		}

		const result = await response.json();
		showToast("Email sent successfully", "success");
		closeModal("emailModal");

		// Clear form
		document.getElementById("email-subject").value = "";
		document.getElementById("email-message").value = "";
	} catch (error) {
		console.error("Error sending email:", error);
		showToast("Failed to send email:", "error");
	}
}

// Export user data
function exportUserData() {
	// const dataStr = JSON.stringify(currentUser, null, 2);
	// const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

	// const exportFileDefaultName = `user_${currentUser.user.id}_data.json`;

	// const linkElement = document.createElement('a');
	// linkElement.setAttribute('href', dataUri);
	// linkElement.setAttribute('download', exportFileDefaultName);
	// linkElement.click();

	window.location.href = `${apiBase}/users/${currentUser.user.id}/export-overview`;
}

// Delete user
async function deleteUser() {
	const confirmed = await showConfirmation(
		"Are you sure you want to permanently delete this user? This action cannot be undone.",
		"Delete user",
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
		const response = await fetch(`${apiBase}/users/${currentUser.user.id}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken(),
			},
		});

		if (!response.ok) {
			throw new Error("Failed to delete user");
		}

		const result = await response.json();
		redirectWithToast(result.message, "success", "admin-users.html");
	} catch (error) {
		console.error("Error deleting user:", error);
		showToast("Failed to delete user: " + error.message, "error");
	}
}

// Back button
document.getElementById("back").addEventListener("click", () => {
	window.location.href = "/frontend/admin/admin-users.html";
});

// Initialize page
document.addEventListener("DOMContentLoaded", loadUserData);

// Close modals when clicking outside
window.onclick = function (event) {
	if (event.target.classList.contains("modal")) {
		event.target.style.display = "none";
	}
};
