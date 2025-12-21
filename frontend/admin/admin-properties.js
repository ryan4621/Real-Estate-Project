// admin-properties.js

const API_BASE = `/admin`;

let currentPage = 1;
const limit = 20;
let currentFilters = {
	search: "",
	type: "all",
	status: "all",
};

let formState = null;
let propertyId = null;
let selectedFiles = [];
let uploadInProgress = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
	setupEventListeners();
	// Check for search parameter in URL
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get('search');
	
	if (searchParam) {
		document.getElementById("searchInput").value = searchParam;
		loadProperties(1);
	} else {
		loadProperties();
	}
});

// Setup event listeners
function setupEventListeners() {
	// Search and filters
	const debouncedSearch = debounce(() => loadProperties(1), 400);
	document.getElementById("searchInput").addEventListener("input", debouncedSearch);
	document.getElementById("properties-type-filter").addEventListener("change", () => loadProperties(1));
	document.getElementById("properties-status-filter").addEventListener("change", () => loadProperties(1));

	// Add property button
	document.getElementById('add-property-btn').addEventListener('click', openAddModal);

	// Refresh button
	document.getElementById('refresh-btn').addEventListener('click', () => location.reload());

	// Export buttons
	document.getElementById('exportCsv').addEventListener('click', () => exportData('csv'));
	document.getElementById('exportPdf').addEventListener('click', () => exportData('pdf'));

	// Modal controls
	setupModalListeners();

	// Form submission
	document.getElementById("propertyForm").addEventListener("submit", handleFormSubmit);

	// Image upload listeners
	setupImageUploadListeners();
}

// Setup modal event listeners
function setupModalListeners() {
	const propertyModal = document.querySelector('.property-modal');
	const modalOverlay = document.querySelector('.modal-overlay');
	const closeModalIcon = document.querySelector(".close-modal-icon");
	const cancelFormBtn = document.querySelector(".cancel-form-btn");
	const closeImagesModal = document.querySelector('.close-images-modal');
	// const closeImagesHub = document.querySelector('.close-images-hub')

	closeModalIcon.addEventListener('click', closeModal);
	modalOverlay.addEventListener('click', closeModal);
	cancelFormBtn.addEventListener('click', closeModal);
	// closeImagesHub.addEventListener('click', closeModal);
	closeImagesModal.addEventListener('click', resetUpload);

	// Prevent closing when clicking inside modal
	propertyModal.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	// Close images hub dynamically
	modalOverlay.addEventListener('click', () => {
		closeModal();
	});
}

// Setup image upload listeners
function setupImageUploadListeners() {
	const fileInput = document.getElementById("fileInput");
	const uploadArea = document.getElementById("upload-area");
	const uploadBtn = document.getElementById("uploadBtn");
	const cancelBtn = document.getElementById("cancelBtn");

	uploadArea.addEventListener("click", () => {
		if (!uploadInProgress) {
			fileInput.click();
		}
	});

	uploadArea.addEventListener("dragover", (e) => {
		e.preventDefault();
		uploadArea.classList.add("image-dragover");
	});

	uploadArea.addEventListener("dragleave", (e) => {
		e.preventDefault();
		uploadArea.classList.remove("image-dragover");
	});

	uploadArea.addEventListener("drop", (e) => {
		e.preventDefault();
		uploadArea.classList.remove("image-dragover");
		if (!uploadInProgress && e.dataTransfer.files.length > 0) {
			handleFileSelect(e.dataTransfer.files);
		}
		document.getElementById("uploadBtns").style.display = "block";
	});

	fileInput.addEventListener("change", (e) => {
		if (e.target.files.length > 0) {
			handleFileSelect(e.target.files);
		}
		document.getElementById("uploadBtns").style.display = "block";
	});

	cancelBtn.addEventListener("click", resetUpload);
	uploadBtn.addEventListener("click", (e) => {
		e.preventDefault();
		if (selectedFiles && !uploadInProgress) {
			uploadFile(propertyId);
		}
	});
}

// Load properties
async function loadProperties(page) {
	try {
		applyFilters();

        if (page) currentPage = page;

		const params = new URLSearchParams({
			page: currentPage,
			limit: limit,
		});

		if (currentFilters.search) params.append("q", currentFilters.search);
		if (currentFilters.type && currentFilters.type !== "all") params.append("property_type", currentFilters.type);
		if (currentFilters.status && currentFilters.status !== "all") params.append("status", currentFilters.status);

		const res = await fetch(`${API_BASE}/properties?${params.toString()}`, {
			credentials: "include",
		});

		const data = await res.json();

		if (data.data.length === 0) {
			document.getElementById("empty-alert").style.display = "block";
			document.getElementById("properties-table").style.display = "none";
			return;
		}

		document.getElementById("empty-alert").style.display = "none";
		document.getElementById("properties-table").style.display = "block";

		const tbody = document.getElementById("properties-table-body");
		tbody.innerHTML = "";

		data.data.forEach(property => {
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${escapeHtml(property.property_id)}</td>
				<td>${escapeHtml(property.property_type)}</td>
				<td>${escapeHtml(property.description)}</td>
				<td>${escapeHtml(property.status)}</td>
				<td>$${parseFloat(property.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				<td>$${parseFloat(property.price_per_sqft).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				<td>${escapeHtml(property.garage_space)}</td>
				<td>${escapeHtml(property.year_built)}</td>
				<td>${escapeHtml(property.bathrooms)}</td>
				<td>${escapeHtml(property.bedrooms)}</td>
				<td>${parseFloat(property.area).toLocaleString()}</td>
				<td>${escapeHtml(property.acre_lot)}</td>
				<td>${escapeHtml(property.street_number)}</td>
				<td>${escapeHtml(property.street_name)}</td>
				<td>${escapeHtml(property.city)}</td>
				<td>${escapeHtml(property.state)}</td>
				<td>${escapeHtml(property.zip)}</td>
				<td>${escapeHtml(property.country)}</td>
				<td>${escapeHtml(property.latitude)}</td>
				<td>${escapeHtml(property.longitude)}</td>
				<td>${escapeHtml(property.agent_name)}</td>
				<td>${escapeHtml(property.agent_email)}</td>
				<td>${escapeHtml(property.broker)}</td>
				<td>${new Date(property.created_at).toLocaleString()}</td>
				<td>${new Date(property.updated_at).toLocaleString()}</td>
				<td>
					<div class="table-action-btns">
						<button class="table-action-btn edit edit-property-btn" data-id="${property.property_id}">
							<i class="fas fa-edit"></i> Edit
						</button>
						<button class="table-action-btn delete delete-property-btn" data-id="${property.property_id}">
							<i class="fas fa-trash"></i> Delete
						</button>
					</div>
				</td>
				<td>
					<div class="table-action-btns">
						<button class="table-action-btn add add-images-btn" data-id="${property.property_id}">
							<i class="fas fa-plus"></i> Add
						</button>
						<button class="table-action-btn view view-images-btn" data-id="${property.property_id}">
							<i class="fas fa-eye"></i> View
						</button>
					</div>
				</td>
			`;

			const descriptionCell = row.querySelector('td:nth-child(3)');
			if (property.description && property.description.length > 50) {
				descriptionCell.setAttribute('title', property.description);
			}

			tbody.appendChild(row);
		});

		attachTableEventListeners();
		renderPagination(data.meta);

	} catch (error) {
		console.error("Error loading properties:", error);
	}
}

// Attach event listeners to table buttons
function attachTableEventListeners() {
	document.querySelectorAll('.edit-property-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			propertyId = e.target.dataset.id;
			await openEditModal(propertyId);
		});
	});

	document.querySelectorAll('.delete-property-btn').forEach(btn => {
		btn.addEventListener('click', async e => {
			propertyId = e.target.dataset.id;
			await deleteProperty(propertyId);
		});
	});

	document.querySelectorAll('.add-images-btn').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			propertyId = e.target.dataset.id;
			openImageUploadModal();
		});
	});

	document.querySelectorAll('.view-images-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			propertyId = e.target.dataset.id;
			loadPropertyImages(propertyId);
		});
	});
}

// Apply filters from UI
function applyFilters() {
	currentFilters = {
		search: document.getElementById("searchInput").value.trim(),
		type: document.getElementById("properties-type-filter").value,
		status: document.getElementById("properties-status-filter").value,
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
	prevBtn.addEventListener("click", () => loadProperties(meta.page - 1));
	container.appendChild(prevBtn);

	// Page numbers
	for (let i = 1; i <= meta.totalPages; i++) {
		const btn = document.createElement("button");
		btn.textContent = i;
		btn.disabled = i === meta.page;
		btn.addEventListener("click", () => loadProperties(i));
		container.appendChild(btn);
	}

	// Next button
	const nextBtn = document.createElement("button");
	nextBtn.textContent = "›";
	nextBtn.disabled = meta.page === meta.totalPages;
	nextBtn.addEventListener("click", () => loadProperties(meta.page + 1));
	container.appendChild(nextBtn);
}

// Open add property modal
function openAddModal() {
	formState = 'add';
	const propertyModal = document.querySelector('.property-modal');
	const modalOverlay = document.querySelector('.modal-overlay');
	const submitBtn = document.getElementById("submitBtn");
	const formTitle = document.getElementById("form-title");

	propertyModal.classList.add('show');
	modalOverlay.classList.add('show');
	submitBtn.textContent = "Create new Property";
	formTitle.textContent = "Add Property";
	document.body.style.overflow = 'hidden';
	document.getElementById("propertyForm").reset();
}

// Open edit property modal
async function openEditModal(id) {
	formState = 'edit';
	const propertyModal = document.querySelector('.property-modal');
	const modalOverlay = document.querySelector('.modal-overlay');
	const submitBtn = document.getElementById("submitBtn");
	const formTitle = document.getElementById("form-title");

	propertyModal.classList.add('show');
	modalOverlay.classList.add('show');
	document.body.style.overflow = 'hidden';
	submitBtn.textContent = "Update Property";
	formTitle.textContent = "Edit Property";
	await loadPropertyData(id);
}

// Close modal
function closeModal() {
	const propertyModal = document.querySelector('.property-modal');
	const modalOverlay = document.querySelector('.modal-overlay');
	const uploadContainer = document.querySelector('.upload-container');
	const propertyImagesContainer = document.querySelector('.property-images');

	propertyModal.classList.remove('show');
	modalOverlay.classList.remove('show');
	uploadContainer.classList.remove('show');
	propertyImagesContainer.style.display = 'none';
	document.body.style.overflow = '';
	document.getElementById("propertyForm").reset();
}

// Load property data for editing
async function loadPropertyData(propertyId) {
	try {
	console.log(propertyId)

		const response = await fetch(`${API_BASE}/properties/${propertyId}`, {
			credentials: "include"
		});

		if (!response.ok) {
			showToast("Property not found", "error");
			return;
		}

		const property = await response.json();

		// Populate form fields
		document.getElementById("propertyType").value = property.property_type || "";
		document.getElementById("description").value = property.description || "";
		document.getElementById("status").value = property.status || "";
		document.getElementById("price").value = property.price || "";
		document.getElementById("pricePerSqft").value = property.price_per_sqft || "";
		document.getElementById("garageSpace").value = property.garage_space || "";
		document.getElementById("yearBuilt").value = property.year_built || "";
		document.getElementById("bedrooms").value = property.bedrooms || "";
		document.getElementById("bathrooms").value = property.bathrooms || "";
		document.getElementById("area").value = property.area || "";
		document.getElementById("acreLot").value = property.acre_lot;
		document.getElementById("streetNumber").value = property.street_number || "";
		document.getElementById("streetName").value = property.street_name || "";
		document.getElementById("city").value = property.city || "";
		document.getElementById("state").value = property.state || "";
		document.getElementById("zip").value = property.zip || "";
		document.getElementById("country").value = property.country || "";
		document.getElementById("latitude").value = property.latitude;
		document.getElementById("longitude").value = property.longitude;
		document.getElementById("agentName").value = property.agent_name || "";
		document.getElementById("agentEmail").value = property.agent_email || "";
		document.getElementById("broker").value = property.broker;

	} catch (error) {
		console.error("Error loading property:", error);
		showToast("Failed to load property data", "error");
	}
}

// Handle form submission
async function handleFormSubmit(e) {
	e.preventDefault();

	const form = e.target;
	const submitBtn = document.getElementById("submitBtn");
	const formData = new FormData(form);
	const propertyData = Object.fromEntries(formData.entries());

	// Convert empty strings to null
	for (const key in propertyData) {
		if (propertyData[key] === "") {
			propertyData[key] = null;
		}
	}

	// Validate required fields
	const requiredFields = ["propertyType", "description", "status", "price", "pricePerSqft", "bedrooms", "bathrooms", "garageSpace", "yearBuilt", "streetNumber", "streetName", "city", "state", "zip", "country", "agentName", "agentEmail"];
	const missingField = requiredFields.some(field => !propertyData[field]);

	if (missingField) {
		showToast("Please fill in all required fields", "info");
		return;
	}

	submitBtn.disabled = true;

	try {
		let url, method;

		if (formState === "edit") {
			url = `${API_BASE}/properties/${propertyId}`;
			method = "PUT";
			submitBtn.textContent = "Updating Property...";
		} else {
			url = `${API_BASE}/properties`;
			method = "POST";
			submitBtn.textContent = "Adding Property...";
		}

		const response = await fetch(url, {
			method: method,
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken(),
			},
			credentials: "include",
			body: JSON.stringify(propertyData),
		});

		const result = await response.json();

		if (response.ok) {
			reloadWithToast(result.message, 'success');
			closeModal();
		}
	} catch (error) {
		console.error("Error:", error);
		showToast("Failed", "error");
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = formState === "edit" ? "Update Property" : "Create new property";
	}
}

// Delete property
async function deleteProperty(propertyId) {
	const confirmed = await showConfirmation(
		"Are you sure you want to delete this property?",
		"Delete Property",
		{
			confirmText: "Continue",
			cancelText: "Cancel",
			danger: true,
		}
	);

	if (!confirmed) return;

	try {
		const res = await fetch(`${API_BASE}/properties/${propertyId}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken(),
			},
		});

		const data = await res.json();
		reloadWithToast(data.message, "success");
	} catch (err) {
		console.error("Error deleting property:", err);
	}
}

// Export data
function exportData(format) {
	const search = document.getElementById("searchInput").value.trim();
	const type = document.getElementById("properties-type-filter").value;
	const status = document.getElementById("properties-status-filter").value;

	const params = new URLSearchParams({ format });

	if (search) params.append("q", search);
	if (type && type !== "all") params.append("property_type", type);
	if (status && status !== "all") params.append("status", status);

	window.location.href = `${API_BASE}/properties/export?${params.toString()}`;
}

// IMAGE UPLOAD SECTION

// Open image upload modal
function openImageUploadModal() {
	formState = 'edit';
	const uploadContainer = document.querySelector('.upload-container');
	const modalOverlay = document.querySelector('.modal-overlay');

	uploadContainer.classList.add('show');
	modalOverlay.classList.add('show');
	document.body.style.overflow = 'hidden';
}

// Handle file selection
function handleFileSelect(files) {
	hideMessages();

	const filesArray = Array.from(files);
	const validFiles = filesArray.filter(file => validateFile(file));

	if (validFiles.length === 0) {
		return;
	}

	selectedFiles = validFiles;
	document.getElementById("uploadBtn").textContent = `Upload ${validFiles.length} Photo(s)`;

	showSuccess(`${validFiles.length} file(s) selected and ready to upload`);
}

// Validate file
function validateFile(file) {
	const maxSize = 5 * 1024 * 1024;
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "video/mp4", "video/mov"];

	if (!allowedTypes.includes(file.type)) {
		showError("Please select a valid image file (PNG, JPG, JPEG, WEBP, AVIF, MP4, MOV)");
		return false;
	}

	if (file.size > maxSize) {
		showError("File size must be less than 5MB");
		return false;
	}

	return true;
}

// Upload file using ImageKit
async function uploadFile(propertyId) {
	if (selectedFiles.length === 0) {
		showError("Please select at least one file");
		return;
	}

	console.log(propertyId)

	if (!propertyId) {
		showError("Property ID is missing. Please try again.");
		return;
	}

	const uploadBtn = document.getElementById("uploadBtn");
	const progressContainer = document.getElementById("progressContainer");
	const progressFill = document.getElementById("progressFill");
	const progressText = document.getElementById("progressText");

	uploadInProgress = true;
	uploadBtn.disabled = true;
	uploadBtn.textContent = "Uploading...";
	progressContainer.style.display = "block";
	hideMessages();

	try {
		simulateProgress();

		const uploadedUrls = [];

		for (let i = 0; i < selectedFiles.length; i++) {
			const file = selectedFiles[i];

			progressText.textContent = `Uploading ${i + 1} of ${selectedFiles.length}...`;
			progressFill.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;

			// Get ImageKit signature
			const sigRes = await fetch(`/admin/properties/upload-signature?fileType=${encodeURIComponent(file.type)}&fileSize=${file.size}`, {
				credentials: "include",
			});

			if (!sigRes.ok) {
				throw new Error("Failed to get upload token");
			}

			const sigData = await sigRes.json();

			// Upload to ImageKit
			const formData = new FormData();
			formData.append("file", file);
			formData.append("publicKey", "public_dXrYyuRIBWgHZeg7s3EoL1xNlZQ=");
			formData.append("signature", sigData.signature);
			formData.append("expire", sigData.expire);
			formData.append("token", sigData.token);
			formData.append("fileName", `property-${propertyId}${Date.now()}-${file.name}`);

			const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
				method: "POST",
				body: formData,
			});

			const uploadData = await uploadRes.json();

			if (uploadData.url) {
				uploadedUrls.push(uploadData.url);
			} else {
				throw new Error("Image upload failed");
			}
		}

		const propertySection = document.getElementById('property-section').value

		// Save to database
		const saveRes = await fetch(`${API_BASE}/properties/${propertyId}/images`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken(),
			},
			credentials: "include",
			body: JSON.stringify({
				property_id: propertyId,
				image_urls: uploadedUrls,
				primary_index: 0,
				property_section: propertySection
			}),
		});

		if (saveRes.ok) {
			const result = await saveRes.json();
			showSuccess(result.message);

			setTimeout(() => {
				resetUpload();
				location.reload();
			}, 2000);
		} else {
			const errorData = await saveRes.json();
			showError(errorData.message || "Failed to upload images");
		}
	} catch (error) {
		console.error("Upload error:", error);
		showError("Upload failed. Please try again.");
	} finally {
		uploadInProgress = false;
		uploadBtn.textContent = "Upload Photo";
		progressContainer.style.display = "none";
	}
}

// Simulate upload progress
function simulateProgress() {
	const progressFill = document.getElementById("progressFill");
	const progressText = document.getElementById("progressText");

	let progress = 0;
	const interval = setInterval(() => {
		progress += Math.random() * 15;
		if (progress > 100) {
			progress = 100;
			clearInterval(interval);
		}
		progressFill.style.width = progress + "%";
		progressText.textContent = `Uploading... ${Math.round(progress)}%`;
	}, 200);
}

// Reset upload state
function resetUpload() {
	const uploadContainer = document.querySelector('.upload-container');
	const modalOverlay = document.querySelector('.modal-overlay');
	const uploadBtn = document.getElementById("uploadBtn");
	const uploadBtns = document.getElementById("uploadBtns");
	const fileInput = document.getElementById("fileInput");
	const progressFill = document.getElementById("progressFill");

	selectedFiles = [];
	fileInput.value = "";
	uploadBtns.style.display = "none";
	uploadBtn.textContent = "Upload Photo(s)";
	uploadContainer.classList.remove('show');
	modalOverlay.classList.remove('show');
	document.body.style.overflow = '';
	hideMessages();
	progressFill.style.width = "0%";
}

// Load property images
async function loadPropertyImages(propertyId) {
	try {
		const response = await fetch(`${API_BASE}/properties/${propertyId}/images`, {
			credentials: "include"
		});

		if (!response.ok) {
			showToast("Failed to load property images", "error");
			return;
		}

		const images = await response.json();

		const propertyImagesContainer = document.querySelector('.property-images');
		const modalOverlay = document.querySelector('.modal-overlay');

		propertyImagesContainer.innerHTML = '';
		propertyImagesContainer.style.display = 'grid';
		modalOverlay.classList.add('show');
		document.body.style.overflow = 'hidden';

		if (images.length === 0) {
			propertyImagesContainer.innerHTML = '<p style="text-align: center; color: #666;">No images uploaded yet</p>';
			return;
		}

		// Add close button
		const closeBtn = document.createElement('button');
		closeBtn.className = 'close-images-hub';
		closeBtn.innerHTML = '<i class="fas fa-times"></i>';
		propertyImagesContainer.appendChild(closeBtn);

		// Create image/video elements
		images.forEach((image) => {
			const imageWrapper = document.createElement('div');
			imageWrapper.className = 'image-wrapper';

			const isVideo = image.image_url.includes('.mp4') || image.image_url.includes('.mov');

			let mediaElement;
			if (isVideo) {
				mediaElement = document.createElement('video');
				mediaElement.src = image.image_url;
				mediaElement.className = 'property-image';
				mediaElement.controls = true;
				mediaElement.preload = 'metadata';
			} else {
				mediaElement = document.createElement('img');
				mediaElement.src = image.image_url;
				mediaElement.alt = 'Property Image';
				mediaElement.className = 'property-image';
			}

			if (image.is_primary) {
				const badge = document.createElement('span');
				badge.className = 'primary-badge';
				badge.textContent = 'Primary';
				imageWrapper.appendChild(badge);
			}

			// Control buttons container
			const controlsDiv = document.createElement('div');
			controlsDiv.className = 'image-controls';

			const propertySectionBadge = document.createElement('span')
			propertySectionBadge.className = 'property-section-badge'
			propertySectionBadge.textContent = `${image.property_section}`
			imageWrapper.appendChild(propertySectionBadge)

			// Set as primary button (only show if not already primary)
			if (!image.is_primary) {
				const setPrimaryBtn = document.createElement('button');
				setPrimaryBtn.className = 'image-control-btn set-primary-btn';
				setPrimaryBtn.innerHTML = '<i class="fas fa-star"></i> Set Primary';
				setPrimaryBtn.onclick = () => setImageAsPrimary(propertyId, image.id);
				controlsDiv.appendChild(setPrimaryBtn);
			}

			// Delete button
			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'image-control-btn delete-image-btn';
			deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
			deleteBtn.onclick = () => deletePropertyImage(propertyId, image.id);
			controlsDiv.appendChild(deleteBtn);

			closeBtn.addEventListener('click', closeModal);

			imageWrapper.appendChild(mediaElement);
			imageWrapper.appendChild(controlsDiv);
			propertyImagesContainer.appendChild(imageWrapper);
		});

	} catch (error) {
		console.error("Error loading images:", error);
		showToast("Failed to load property images", "error");
	}
}

// Set image as primary
async function setImageAsPrimary(propertyId, imageId) {
	const confirmed = await showConfirmation(
		"Set this image as the primary image for this property?",
		"Set Primary Image",
		{
			confirmText: "Set Primary",
			cancelText: "Cancel",
		}
	);

	if (!confirmed) return;

	try {
		const response = await fetch(`${API_BASE}/properties/${propertyId}/images/${imageId}/primary`, {
			method: "PATCH",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken(),
			},
		});

		const result = await response.json();

		if (response.ok) {
			showToast(result.message, "success");
			loadPropertyImages(propertyId);
		} else {
			showToast(result.message || "Failed to set primary image", "error");
		}
	} catch (error) {
		console.error("Error setting primary image:", error);
		showToast("Failed to set primary image", "error");
	}
}

// Delete property image
async function deletePropertyImage(propertyId, imageId) {
	const confirmed = await showConfirmation(
		"Are you sure you want to delete this image? This action cannot be undone.",
		"Delete Image",
		{
			confirmText: "Delete",
			cancelText: "Cancel",
			danger: true,
		}
	);

	if (!confirmed) return;

	try {
		const response = await fetch(`${API_BASE}/properties/${propertyId}/images/${imageId}`, {
			method: "DELETE",
			credentials: "include",
			headers: {
				"x-csrf-token": window.getCsrfToken(),
			},
		});

		const result = await response.json();

		if (response.ok) {
			showToast(result.message, "success");
			// Reload images to show updated list
			loadPropertyImages(propertyId);
		} else {
			showToast(result.message || "Failed to delete image", "error");
		}
	} catch (error) {
		console.error("Error deleting image:", error);
		showToast("Failed to delete image", "error");
	}
}

// Message functions
function showError(message) {
	const errorMessage = document.getElementById("errorMessage");
	const successMessage = document.getElementById("successMessage");

	errorMessage.textContent = message;
	errorMessage.style.display = "block";
	successMessage.style.display = "none";
}

function showSuccess(message) {
	const successMessage = document.getElementById("successMessage");
	const errorMessage = document.getElementById("errorMessage");

	successMessage.textContent = message;
	successMessage.style.display = "block";
	errorMessage.style.display = "none";
}

function hideMessages() {
	document.getElementById("errorMessage").style.display = "none";
	document.getElementById("successMessage").style.display = "none";
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