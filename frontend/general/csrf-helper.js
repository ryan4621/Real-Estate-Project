// csrf-helper.js
let csrfToken = null;

// Get CSRF token from server
async function initCsrfToken() {
	try {
		const response = await fetch(`/public/csrf-token`, {
			credentials: "include",
		});
		const data = await response.json();
		csrfToken = data.csrfToken;

	} catch (err) {
		console.error("❌ Failed to get CSRF token:", err);
	}
}

async function refreshCsrfToken() {
	try {
		const response = await fetch(`/public/csrf-token`, {
			credentials: "include",
		});
		const data = await response.json();
		csrfToken = data.csrfToken;
		return csrfToken;
	} catch (err) {
		return null;
	}
}

// Get the current token (use this in your fetch calls)
function getCsrfToken() {
	return csrfToken;
}

// Centralized fetch with automatic CSRF handling
async function csrfFetch(url, options = {}) {
	// Ensure token exists before sending
	if (!getCsrfToken()) {
		await initCsrfToken();
	}

	let token = getCsrfToken();

	const finalOptions = {
		...options,
		headers: {
			"Content-Type": "application/json",
			"x-csrf-token": token,
			...(options.headers || {}),
		},
		credentials: "include",
	};

	let response = await fetch(url, finalOptions);

	// If the token is invalid or expired, refresh and retry once
	if (response.status === 403) {
		console.warn("⚠️ CSRF token invalid, refreshing...");
		token = await refreshCsrfToken();
		finalOptions.headers["x-csrf-token"] = token;
		response = await fetch(url, finalOptions);
	}

	return response;
}

// Initialize token when this file loads
initCsrfToken();

// Export functions so other files can use them
window.getCsrfToken = getCsrfToken;
window.initCsrfToken = initCsrfToken;
window.refreshCsrfToken = refreshCsrfToken;
window.csrfFetch = csrfFetch;
