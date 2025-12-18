const profileFileInput = document.getElementById("profileFileInput");
const profileUploadArea = document.getElementById("profileUploadArea");
const profileCurrentPhoto = document.getElementById("profile-photo");
const changeProfilePhoto = document.getElementById("change-profile-photo");
const profilePreviewArea = document.getElementById("profilePreviewArea");
const profilePreviewImage = document.getElementById("profilePreviewImage");
const profileUploadButtons = document.getElementById("profileUploadButtons");
const profileUploadBtn = document.getElementById("profileUploadBtn");
const profileCancelUploadBtn = document.getElementById("profileCancelUploadBtn");
const profileReuploadBtn = document.getElementById("profileReuploadBtn");
const profileProgressContainer = document.getElementById("profileProgressContainer");
const profileProgressFill = document.getElementById("profileProgressFill");
const profileProgressText = document.getElementById("profileProgressText");
const profileErrorMessage = document.getElementById("profileErrorMessage");
const profileSuccessMessage = document.getElementById("profileSuccessMessage");

let profileSelectedFile = null;
let profileUploadInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentProfilePhoto();
    setupPhotoEventListeners();
});

function setupPhotoEventListeners() {

    changeProfilePhoto.addEventListener("click", () => {
        if (!profileUploadInProgress) {
            showProfileUploadArea();
        }
    });

    profileUploadArea.addEventListener("click", () => {
        if (!profileUploadInProgress) {
            profileFileInput.click();
        }
    });

    profileUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        profileUploadArea.classList.add("profile-dragover");
    });

    profileUploadArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        profileUploadArea.classList.remove("profile-dragover");
    });

    profileUploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        profileUploadArea.classList.remove("profile-dragover");

        if (!profileUploadInProgress && e.dataTransfer.files.length > 0) {
            handleProfileFileSelect(e.dataTransfer.files[0]);
        }
    });

    profileFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleProfileFileSelect(e.target.files[0]);
        }
    });

    profileReuploadBtn.addEventListener("click", () => {
        profileSelectedFile = null;
        profileFileInput.value = "";
        showProfileUploadArea();
    });

    profileCancelUploadBtn.addEventListener("click", () => {
        resetProfileUpload();
    });

    profileUploadBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (profileSelectedFile && !profileUploadInProgress) {
            uploadProfileFile();
        }
    });
};

// Load current profile photo on page load
async function loadCurrentProfilePhoto() {
    try {
        const response = await fetch(`/auth/me`, {
            credentials: "include",
        });

        const user = await response.json();

        if (user.profile_image) {
            updateCurrentProfilePhoto(user.profile_image);
        } else {
            console.log("No profile_image found in user object");
        }
    } catch (error) {
        console.error("Failed to load current photo:", error);
    }
}

// Show upload area and instructions
function showProfileUploadArea() {
    // profileUploadInstructions.style.display = "block";
    changeProfilePhoto.style.display = "none";
    profileUploadArea.style.display = "block";
    profilePreviewArea.style.display = "none";
    profileUploadButtons.style.display = "none";
}

// Hide upload area and instructions
function hideProfileUploadArea() {
    // profileUploadInstructions.style.display = "none";
    changeProfilePhoto.style.display = "block";
    profileUploadArea.style.display = "none";
    profilePreviewArea.style.display = "none";
    profileUploadButtons.style.display = "none";
}

// Handle file selection
function handleProfileFileSelect(file) {
    hideProfileMessages();

    if (!validateProfileFile(file)) {
        return;
    }

    profileSelectedFile = file;
    showProfilePreview(file);
}

// Show preview area
function showProfilePreview(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        profilePreviewImage.src = e.target.result;
        profileUploadArea.style.display = "none";
        profilePreviewArea.style.display = "block";
        profileUploadButtons.style.display = "flex";
    };

    reader.readAsDataURL(file);
}

// Validate file
function validateProfileFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
        showProfileError("Please select a valid image file (PNG, JPG, JPEG)");
        return false;
    }

    if (file.size > maxSize) {
        showProfileError("File size must be less than 5MB");
        return false;
    }

    return true;
}

// Upload file using ImageKit
async function uploadProfileFile() {
    if (!profileSelectedFile) return;

    profileUploadInProgress = true;
    profileUploadBtn.disabled = true;
    profileUploadBtn.textContent = "Uploading...";
    profileProgressContainer.style.display = "block";
    hideProfileMessages();

    try {
        simulateProfileProgress();

        const sigRes = await fetch(`/api/profile/upload-signature?fileType=${encodeURIComponent(profileSelectedFile.type)}&fileSize=${profileSelectedFile.size}`, {
            credentials: "include",
        });

        if (!sigRes.ok) {
            throw new Error("Failed to get upload token");
        }

        const sigData = await sigRes.json();

        // Upload to ImageKit
        const formData = new FormData();
        formData.append("file", profileSelectedFile);
        formData.append("publicKey", "public_dXrYyuRIBWgHZeg7s3EoL1xNlZQ=");
        formData.append("signature", sigData.signature);
        formData.append("expire", sigData.expire);
        formData.append("token", sigData.token);
        formData.append(
            "fileName", `profile-${Date.now()}-${profileSelectedFile.name}`
        );

        const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
            method: "POST",
            body: formData,
        });

        const uploadData = await uploadRes.json();

        if (uploadData.url) {
            // Update user profile with new image URL
            const updateRes = await fetch(`/api/update-profile-photo`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-csrf-token": window.getCsrfToken(),
                },
                credentials: "include",
                body: JSON.stringify({ profile_image: uploadData.url }),
            });

            if (updateRes.ok) {
                showProfileSuccess("Profile photo uploaded successfully!");
                updateCurrentProfilePhoto(uploadData.url);

                // Hide everything except the profile photo circle after successful upload
                setTimeout(() => {
                    resetProfileUpload();
                }, 2000);
            } else {
                const errorData = await updateRes.json();
                showProfileError(errorData.message || "Failed to update profile");
            }
        } else {
            showProfileError("Image upload failed. Please try again.");
        }
    } catch (error) {
        console.error("Upload error:", error);
        showProfileError(
            "Network error. Please check your connection and try again."
        );
    } finally {
        profileUploadInProgress = false;
        profileUploadBtn.disabled = false;
        profileUploadBtn.textContent = "Upload Photo";
        profileProgressContainer.style.display = "none";
    }
}

// Simulate upload progress
function simulateProfileProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) {
            progress = 100;
            clearInterval(interval);
        }
        profileProgressFill.style.width = progress + "%";
        profileProgressText.textContent = `Uploading... ${Math.round(progress)}%`;
    }, 200);
}

// Reset upload state
function resetProfileUpload() {
    profileSelectedFile = null;
    profileFileInput.value = "";
    hideProfileUploadArea();
    hideProfileMessages();
    profileProgressFill.style.width = "0%";
}

// Update current photo display (persists after reload)
function updateCurrentProfilePhoto(photoUrl) {
    profileCurrentPhoto.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
}

// Message functions
function showProfileError(message) {
    profileErrorMessage.textContent = message;
    profileErrorMessage.style.display = "block";
    profileSuccessMessage.style.display = "none";
}

function showProfileSuccess(message) {
    profileSuccessMessage.textContent = message;
    profileSuccessMessage.style.display = "block";
    profileErrorMessage.style.display = "none";
}

function hideProfileMessages() {
    profileErrorMessage.style.display = "none";
    profileSuccessMessage.style.display = "none";
}
