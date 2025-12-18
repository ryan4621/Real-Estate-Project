// support.js
document.addEventListener("DOMContentLoaded", function () {
	// Get form elements
	const contactForm = document.getElementById("contact-support-form");
	const submitButton = document.getElementById("support-submit-button");
	const successMessage = document.getElementById("contact-success-message");

	// Form fields
	const nameField = document.getElementById("contact-name");
	const emailField = document.getElementById("contact-email");
	const subjectField = document.getElementById("contact-subject");
	const messageField = document.getElementById("contact-message");

	// Error elements
	const nameError = document.getElementById("contact-name-error");
	const emailError = document.getElementById("contact-email-error");
	const subjectError = document.getElementById("contact-subject-error");
	const messageError = document.getElementById("contact-message-error");

	// Auto-populate user info if logged in
	loadUserInfo();

	// Real-time validation
	setupRealTimeValidation();

	// Handle form submission
	contactForm.addEventListener("submit", handleFormSubmit);


	// Load user information if authenticated
	async function loadUserInfo() {

		try {
			const response = await fetch('/auth/me', {
				credentials: "include",
			});

			if (response.ok) {

				const data = await response.json();

				if (data) {
                    const fullName = data.first_name + " " + data.last_name
					nameField.value = fullName || "";
					emailField.value = data.email || "";

					if (fullName) {
						nameField.setAttribute("readonly", true);
						nameField.style.backgroundColor = "#f8f9fa";
					}
					if (data.email) {
						emailField.setAttribute("readonly", true);
						emailField.style.backgroundColor = "#f8f9fa";
					}
				}
			}


		} catch (error) {
			console.log("User not authenticated or error loading profile");
		}
	}

    // Set up real-time validation for form fields
	function setupRealTimeValidation() {
		// Name validation
		nameField.addEventListener("blur", () => validateName());
		nameField.addEventListener("input", () => clearError(nameError));

		// Email validation
		emailField.addEventListener("blur", () => validateEmail());
		emailField.addEventListener("input", () => clearError(emailError));

		// Subject validation
		subjectField.addEventListener("change", () => validateSubject());

		// Message validation
		messageField.addEventListener("blur", () => validateMessage());
		messageField.addEventListener("input", () => {
			clearError(messageError);
			updateCharacterCount();
		});

		// Initialize character count
		updateCharacterCount();
	}


	// Validate name field
	function validateName() {
		const name = nameField.value.trim();

		if (name.length === 0) {
			showError(nameError, "Name is required");
			return false;
		}

		if (name.length < 2) {
			showError(nameError, "Name must be at least 2 characters long");
			return false;
		}

		if (name.length > 100) {
			showError(nameError, "Name must not exceed 100 characters");
			return false;
		}

		const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
		if (!nameRegex.test(name)) {
			showError(
				nameError,
				"Name can only contain letters, spaces, hyphens, apostrophes, and periods"
			);
			return false;
		}

		clearError(nameError);
		return true;
	}

	/**
	 * Validate email field
	 */
	function validateEmail() {
		const email = emailField.value.trim();

		if (email.length === 0) {
			showError(emailError, "Email is required");
			return false;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			showError(emailError, "Please enter a valid email address");
			return false;
		}

		clearError(emailError);
		return true;
	}

	/**
	 * Validate subject field
	 */
	function validateSubject() {
		const subject = subjectField.value;

		if (!subject) {
			showError(subjectError, "Please select a subject");
			return false;
		}

		const validSubjects = [
			"general",
			"account",
			"listings",
			"technical",
			"other",
		];
		if (!validSubjects.includes(subject)) {
			showError(subjectError, "Please select a valid subject");
			return false;
		}

		clearError(subjectError);
		return true;
	}

	/**
	 * Validate message field
	 */
	function validateMessage() {
		const message = messageField.value.trim();

		if (message.length === 0) {
			showError(messageError, "Message is required");
			return false;
		}

		if (message.length < 10) {
			showError(messageError, "Message must be at least 10 characters long");
			return false;
		}

		if (message.length > 2000) {
			showError(messageError, "Message must not exceed 2000 characters");
			return false;
		}

		clearError(messageError);
		return true;
	}

	/**
	 * Update character count for message field
	 */
	function updateCharacterCount() {
		const message = messageField.value;
		const currentLength = message.length;
		const maxLength = 2000;

		// Remove existing character count
		const existingCount = messageField.parentElement.querySelector(
			".contact-character-count"
		);
		if (existingCount) {
			existingCount.remove();
		}

		// Add character count
		const characterCount = document.createElement("div");
		characterCount.className = "contact-character-count";
		characterCount.style.cssText = `
        font-size: 0.875rem;
        color: ${currentLength > maxLength ? "#e74c3c" : "#6c757d"};
        text-align: right;
        margin-top: 0.25rem;
      `;
		characterCount.textContent = `${currentLength}/${maxLength}`;

		messageField.parentElement.appendChild(characterCount);
	}

	/**
	 * Show error message
	 */
	function showError(errorElement, message) {
		errorElement.textContent = message;
		errorElement.style.display = "block";
		errorElement.parentElement.querySelector(
			"input, select, textarea"
		).style.borderColor = "#e74c3c";
	}

	/**
	 * Clear error message
	 */
	function clearError(errorElement) {
		errorElement.textContent = "";
		errorElement.style.display = "none";
		errorElement.parentElement.querySelector(
			"input, select, textarea"
		).style.borderColor = "#e9ecef";
	}

	/**
	 * Validate entire form
	 */
	function validateForm() {
		const nameValid = validateName();
		const emailValid = validateEmail();
		const subjectValid = validateSubject();
		const messageValid = validateMessage();

		return nameValid && emailValid && subjectValid && messageValid;
	}

	/**
	 * Set loading state
	 */
	function setLoadingState(isLoading) {
		submitButton.disabled = isLoading;

		if (isLoading) {
			submitButton.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Sending...
          </span>
        `;
			submitButton.style.opacity = "0.7";
			contactForm.classList.add("contact-form-loading");
		} else {
			submitButton.innerHTML = "Send Message";
			submitButton.style.opacity = "1";
			contactForm.classList.remove("contact-form-loading");
		}
	}

	/**
	 * Show success message
	 */
	function showSuccessMessage(customMessage = null) {
		const message =
			customMessage ||
			"Message sent successfully! We've received your inquiry and will respond within 24 hours.";
		successMessage.innerHTML = `<strong>Success!</strong> ${message}`;
		successMessage.style.display = "block";

		// Scroll to success message
		successMessage.scrollIntoView({ behavior: "smooth", block: "center" });

		// Reset form
		contactForm.reset();
		updateCharacterCount();
	}

	/**
	 * Show general error message
	 */
	function showGeneralError(message) {
		// Remove existing general error
		const existingError = contactForm.querySelector(".contact-general-error");
		if (existingError) {
			existingError.remove();
		}

		// Create error message
		const errorDiv = document.createElement("div");
		errorDiv.className = "contact-general-error";
		errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            margin-bottom: 1.5rem;
      `;
		errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;

		// Insert at top of form
		const formTitle = contactForm.querySelector(".contact-form-title");
		formTitle.insertAdjacentElement("afterend", errorDiv);

		// Scroll to error
		errorDiv.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	/**
	 * Handle form submission
	 */
	async function handleFormSubmit(event) {
		event.preventDefault();

		// Hide previous messages
		successMessage.style.display = "none";
		const existingError = contactForm.querySelector(".contact-general-error");
		if (existingError) {
			existingError.remove();
		}

		// Validate form
		if (!validateForm()) {
			showGeneralError("Please fix the errors above and try again.");
			return;
		}

		// Set loading state
		setLoadingState(true);

		try {
			// Prepare form data
			const formData = {
				name: nameField.value.trim(),
				email: emailField.value.trim(),
				subject: subjectField.value,
				message: messageField.value.trim(),
			};

			// Submit form
			const response = await fetch(`/api/contact`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": window.getCsrfToken(),
				},
				credentials: "include",
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// Success
				let successMsg = data.message;
				if (data.data && data.data.estimatedResponse) {
					successMsg = ` Message sent successfully! We've received your inquiry and will respond within ${data.data.estimatedResponse}.`;
				}
				showSuccessMessage(successMsg);

				// Track success event (if analytics available)
				if (typeof gtag !== "undefined") {
					gtag("event", "contact_form_submit", {
						event_category: "engagement",
						event_label: formData.subject,
					});
				}
				setTimeout(() => {
					location.reload();
				}, 3000);
			} else {
				// Server returned error
				if (data.errors && Array.isArray(data.errors)) {
					// Validation errors
					data.errors.forEach((error) => {
						const fieldName = error.path || error.param;
						const errorMessage = error.msg;

						switch (fieldName) {
							case "name":
								showError(nameError, errorMessage);
								break;
							case "email":
								showError(emailError, errorMessage);
								break;
							case "subject":
								showError(subjectError, errorMessage);
								break;
							case "message":
								showError(messageError, errorMessage);
								break;
							default:
								showGeneralError(errorMessage);
						}
					});
				} else {
					showGeneralError(
						data.message || "Failed to send your message. Please try again."
					);
				}
			}
		} catch (error) {
			console.error("Contact form submission error:", error);
			showGeneralError(
				"Network error. Please check your connection and try again."
			);
		} finally {
			setLoadingState(false);
		}
	}

	// Add CSS for loading animation
	const style = document.createElement("style");
	style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    `;
	document.head.appendChild(style);
});
