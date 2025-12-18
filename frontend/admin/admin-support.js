// admin-support.js

const API_BASE = '/admin';

let currentPage = 1;
const limit = 10;
let currentFilters = {
	status: "all",
	priority: "all",
	subject: "all",
	search: "",
};
let tickets = [];
let stats = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
	setupEventListeners();
	loadStats();
	loadTickets();
});

// Setup event listeners
function setupEventListeners() {

    const debouncedSearch = debounce(() => loadTickets(1), 400);
    document.getElementById("searchInput").addEventListener("input", debouncedSearch);
    document.getElementById("status-filter").addEventListener("change", () => loadTickets(1));
    document.getElementById("priority-filter").addEventListener("change", () => loadTickets(1));
    document.getElementById("subject-filter").addEventListener("change", () => loadTickets(1));

    document.getElementById('exportCsv').addEventListener('click', () => exportData('csv'));
    document.getElementById('exportPdf').addEventListener('click', () => exportData('pdf'));

	document.getElementById("support-refresh-btn").addEventListener("click", () => refreshData());

	document.getElementById("closeModalBtn").addEventListener("click", () => {
		closeModal();
	});

	document.getElementById("ticketModal").addEventListener("click", (e) => {
		if (e.target.id === "ticketModal") {
			closeModal();
		}
	});

}

// Load statistics
async function loadStats() {
	try {
		const response = await fetch(`${API_BASE}/contact/statistics`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const data = await response.json();
		stats = data.data;
		updateStatsDisplay();
	} catch (error) {
		console.error("Failed to load stats:", error);
		showToast("Failed to load statistics", "error");
	}
}

// Update statistics display
function updateStatsDisplay() {
	if (!stats.byStatus) return;

	let pendingCount = 0;
	let inProgressCount = 0;
	let resolvedCount = 0;
	let closedCount = 0;

	stats.byStatus.forEach((item) => {
		switch (item.status) {
			case "pending":
				pendingCount = item.count;
				break;
			case "in_progress":
				inProgressCount = item.count;
				break;
			case "resolved":
				resolvedCount += item.count;
				break;
			case "closed":
				closedCount += item.count;
				break;
		}
	});

	let highPriorityCount = 0;
	if (stats.byPriority) {
		stats.byPriority.forEach((item) => {
			if (item.priority === "high" || item.priority === "urgent") {
				highPriorityCount += item.count;
			}
		});
	}

	document.getElementById("pendingCount").textContent = pendingCount;
	document.getElementById("inProgressCount").textContent = inProgressCount;
	document.getElementById("resolvedCount").textContent = resolvedCount;
	document.getElementById("highPriorityCount").textContent = highPriorityCount;
	document.getElementById("closedCount").textContent = closedCount;
}

// Load tickets
async function loadTickets(page) {
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
        if (currentFilters.status && currentFilters.status !== "all") params.append("status", currentFilters.status);
        if (currentFilters.priority && currentFilters.priority !== "all") params.append("priority", currentFilters.priority);
        if (currentFilters.subject && currentFilters.subject !== "all") params.append("subject", currentFilters.subject);

		const response = await fetch(`${API_BASE}/contact/submissions?${params}`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const data = await response.json();
		tickets = data.data;

		renderTickets();
		renderPagination(data.meta);
	} catch (error) {
		console.error("Failed to load tickets:", error);
		showErrorState("Failed to load support tickets");
	}
}

function applyFilters() {
    currentFilters = {
        search: document.getElementById("searchInput").value.trim(),
        status: document.getElementById("status-filter").value,
        priority: document.getElementById("priority-filter").value,
        subject: document.getElementById("subject-filter").value,
    };
}

// Render pagination controls
function renderPagination(meta) {
    const container = document.getElementById("pagination");
    if (!container) return;

    container.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous ‹";
    prevBtn.disabled = meta.page === 1;
    prevBtn.addEventListener("click", () => loadTickets(meta.page - 1));
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= meta.totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i === meta.page;
        btn.addEventListener("click", () => loadTickets(i));
        container.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ›";
    nextBtn.disabled = meta.page === meta.totalPages;
    nextBtn.addEventListener("click", () => loadTickets(meta.page + 1));
    container.appendChild(nextBtn);
}

// Show loading state
function showLoadingState() {
	document.getElementById("loadingState").style.display = "block";
	document.getElementById("emptyState").style.display = "none";
	document.getElementById("ticketsTable").style.display = "none";
}

// Show error state
function showErrorState(message) {
	document.getElementById("loadingState").style.display = "none";
	document.getElementById("emptyState").style.display = "block";
	document.getElementById("ticketsTable").style.display = "none";

	const emptyState = document.getElementById("emptyState");
	emptyState.innerHTML = `
		<div class="support-empty-icon">⚠️</div>
		<h3>Error Loading Tickets</h3>
		<p>${message}</p>
		<button class="support-btn support-btn-primary" onclick="refreshData()">
			Try Again
		</button>
	`;
}

// Render tickets
function renderTickets() {
	const tbody = document.getElementById("ticketsTableBody");

	if (tickets.length === 0) {
		document.getElementById("loadingState").style.display = "none";
		document.getElementById("emptyState").style.display = "block";
		document.getElementById("ticketsTable").style.display = "none";
		return;
	}

	document.getElementById("loadingState").style.display = "none";
	document.getElementById("emptyState").style.display = "none";
	document.getElementById("ticketsTable").style.display = "table";

	tbody.innerHTML = tickets.map((ticket) => renderTicketRow(ticket)).join("");

	document.getElementById("displayedTicketsCount").textContent = `${tickets.length} tickets`;
	// document.getElementById("totalTicketsInfo").textContent = `Total: ${pagination.total} tickets`;

	attachTicketEventListeners();
}

// Render single ticket row
function renderTicketRow(ticket) {
	const createdDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const customerName = ticket.user_name || ticket.name;
	const customerInfo = ticket.user_id
		? `${customerName} (User)`
		: `${customerName} (Guest)`;

	return `
		<tr>
			<td>#${ticket.id}</td>
			<td>
				<div>
					<strong>${customerInfo}</strong><br>
					<small style="color: #7f8c8d;">${ticket.email}</small>
				</div>
			</td>
			<td>
				<div>
					<strong>${formatSubject(ticket.subject)}</strong><br>
					<small style="color: #7f8c8d;">${truncateText(ticket.message, 50)}</small>
				</div>
			</td>
			<td>
				<span class="support-status-badge support-status-${ticket.status.replace("_", "-")}">
					${formatStatus(ticket.status)}
				</span>
			</td>
			<td>
				<span class="support-priority-badge support-priority-${ticket.priority}">
					${ticket.priority}
				</span>
			</td>
			<td>${createdDate}</td>
			<td>
				<div class="support-ticket-actions">
					<button class="support-action-btn support-action-view view-ticket-btn" 
									data-id="${ticket.id}" 
									title="View Details">
						👁️
					</button>
					<button class="support-action-btn support-action-edit edit-ticket-btn" 
									data-id="${ticket.id}" 
									title="Edit Status">
						✏️
					</button>
				</div>
			</td>
		</tr>
	`;
}

// Attach event listeners to ticket buttons
function attachTicketEventListeners() {
	document.querySelectorAll('.view-ticket-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const ticketId = e.currentTarget.dataset.id;
			viewTicket(ticketId);
		});
	});

	document.querySelectorAll('.edit-ticket-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const ticketId = e.currentTarget.dataset.id;
			editTicket(ticketId);
		});
	});
}

// Format subject
function formatSubject(subject) {
	const subjects = {
		general: "General Inquiry",
		account: "Account Issues",
		product: "Product Questions",
		technical: "Technical Support",
		billing: "Billing & Payments",
		feedback: "Feedback",
		other: "Other",
	};
	return subjects[subject] || subject;
}

// Format status
function formatStatus(status) {
	const statuses = {
		pending: "Pending",
		in_progress: "In Progress",
		resolved: "Resolved",
		closed: "Closed",
	};
	return statuses[status] || status;
}

// Truncate text
function truncateText(text, length) {
	return text.length > length ? text.substring(0, length) + "..." : text;
}

// View ticket details
async function viewTicket(ticketId) {
	showTicketModal();
	showModalLoading();

	try {
		const response = await fetch(`${API_BASE}/contact/submission/${ticketId}`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const ticket = await response.json();
		renderTicketDetails(ticket);
	} catch (error) {
		console.error("Failed to load ticket details:", error);
		showModalError("Failed to load ticket details");
	}
}

// Edit ticket
async function editTicket(ticketId) {
	showTicketModal();
	showModalLoading();

	try {
		const response = await fetch(`${API_BASE}/contact/submission/${ticketId}`, {
			credentials: "include",
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const ticket = await response.json();
		renderTicketEditForm(ticket);
	} catch (error) {
		console.error("Failed to load ticket for editing:", error);
		showModalError("Failed to load ticket for editing");
	}
}

// Render ticket details in modal
function renderTicketDetails(ticket) {
	document.getElementById("modalTitle").textContent = `Ticket #${ticket.id} - Details`;

	const createdDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const respondedDate = ticket.responded_at
		? new Date(ticket.responded_at).toLocaleDateString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
		  })
		: "Not responded";

	document.getElementById("modalBody").innerHTML = `
		<div style="display: grid; gap: 1.5rem;">
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
				<div>
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Customer Information</h4>
					<p><strong>Name:</strong> ${ticket.name}</p>
					<p><strong>Email:</strong> ${ticket.email}</p>
					<p><strong>Account:</strong> ${ticket.user_id ? "Registered User" : "Guest"}</p>
				</div>
				<div>
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Ticket Information</h4>
					<p><strong>Subject:</strong> ${formatSubject(ticket.subject)}</p>
					<p><strong>Priority:</strong> 
						<span class="support-priority-badge support-priority-${ticket.priority}">
							${ticket.priority}
						</span>
					</p>
					<p><strong>Status:</strong> 
						<span class="support-status-badge support-status-${ticket.status.replace("_", "-")}">
							${formatStatus(ticket.status)}
						</span>
					</p>
				</div>
			</div>
			
			<div>
				<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Message</h4>
				<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #3498db;">
					${ticket.message.replace(/\n/g, "<br>")}
				</div>
			</div>

			${ticket.admin_notes ? `
				<div>
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Admin Notes</h4>
					<div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid #f39c12;">
						${ticket.admin_notes.replace(/\n/g, "<br>")}
					</div>
				</div>
			` : ""}

			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; color: #7f8c8d;">
				<p><strong>Created:</strong> ${createdDate}</p>
				<p><strong>Responded:</strong> ${respondedDate}</p>
			</div>

			<div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
				<button class="support-btn support-btn-secondary" onclick="closeModal()">
					Close
				</button>
				<button class="support-btn support-btn-primary" onclick="editTicket(${ticket.id})">
					Edit Ticket
				</button>
			</div>
		</div>
	`;
}

// Render ticket edit form in modal
function renderTicketEditForm(ticket) {
	document.getElementById("modalTitle").textContent = `Edit Ticket #${ticket.id}`;

	document.getElementById("modalBody").innerHTML = `
		<form id="editTicketForm">
			<div style="display: grid; gap: 1.5rem;">
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
					<div>
						<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Status</label>
						<select id="editStatus" class="support-filter-select" style="width: 100%;">
							<option value="pending" ${ticket.status === "pending" ? "selected" : ""}>Pending</option>
							<option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>In Progress</option>
							<option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>Resolved</option>
							<option value="closed" ${ticket.status === "closed" ? "selected" : ""}>Closed</option>
						</select>
					</div>
					<div>
						<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Priority</label>
						<select id="editPriority" class="support-filter-select" style="width: 100%;">
							<option value="low" ${ticket.priority === "low" ? "selected" : ""}>Low</option>
							<option value="normal" ${ticket.priority === "normal" ? "selected" : ""}>Normal</option>
							<option value="high" ${ticket.priority === "high" ? "selected" : ""}>High</option>
							<option value="urgent" ${ticket.priority === "urgent" ? "selected" : ""}>Urgent</option>
						</select>
					</div>
				</div>

				<div>
					<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Admin Notes</label>
					<textarea id="editAdminNotes" 
										style="width: 100%; min-height: 120px; padding: 0.75rem; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; resize: vertical;"
										placeholder="Add internal notes about this ticket...">${ticket.admin_notes || ""}</textarea>
					<small style="color: #7f8c8d;">These notes are only visible to admins.</small>
				</div>

				<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
					<h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Original Message</h4>
					<p style="margin: 0; color: #7f8c8d;">${ticket.message}</p>
				</div>

				<div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
					<button type="button" class="support-btn support-btn-secondary" onclick="closeModal()">
						Cancel
					</button>
					<button type="submit" class="support-btn support-btn-primary">
						Update Ticket
					</button>
				</div>
			</div>
		</form>
	`;

	document.getElementById("editTicketForm").addEventListener("submit", (e) => {
		e.preventDefault();
		updateTicket(ticket.id);
	});
}

// Update ticket
async function updateTicket(ticketId) {
	const status = document.getElementById("editStatus").value;
	const priority = document.getElementById("editPriority").value;
	const admin_notes = document.getElementById("editAdminNotes").value;

	try {
		const response = await fetch(`${API_BASE}/contact/submission/${ticketId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken(),
			},
			credentials: "include",
			body: JSON.stringify({ status, priority, admin_notes }),
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		await response.json();

		closeModal();
		showToast("Ticket updated successfully", "success");
		refreshData(false);
	} catch (error) {
		console.error("Failed to update ticket:", error);
		showToast("Failed to update ticket", "error");
	}
}

// Modal functions
function showTicketModal() {
	document.getElementById("ticketModal").style.display = "block";
}

function closeModal() {
	document.getElementById("ticketModal").style.display = "none";
}

function showModalLoading() {
	document.getElementById("modalBody").innerHTML = `
		<div class="support-loading">
			<div class="support-loading-spinner"></div>
			<p>Loading ticket details...</p>
		</div>
	`;
}

function showModalError(message) {
	document.getElementById("modalBody").innerHTML = `
		<div style="text-align: center; padding: 2rem; color: #7f8c8d;">
			<div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
			<h3>Error</h3>
			<p>${message}</p>
			<button class="support-btn support-btn-primary" onclick="closeModal()">
				Close
			</button>
		</div>
	`;
}

// Refresh data
function refreshData(showMessage = true) {
	// loadStats();
	// loadTickets();
	// if (showMessage) {
	// 	showToast("Data refreshed successfully", "success");
	// }

    window.location.reload()
}

function exportData(format) {
    const search = document.getElementById("searchInput").value.trim();
    const status = document.getElementById("status-filter").value;
    const priority = document.getElementById("priority-filter").value;
    const subject = document.getElementById("subject-filter").value;

    const params = new URLSearchParams({ format });

    if (search) params.append("q", search);
    if (status && status !== "all") params.append("status", status);
    if (priority && priority !== "all") params.append("priority", priority);
    if (subject && subject !== "all") params.append("subject", subject);

    window.location.href = `${API_BASE}/contact/export?${params.toString()}`;
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