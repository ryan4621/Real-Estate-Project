const API_BASE = '/api'

const editProfileModal = document.getElementById('edit-profile-modal');
const editProfileOverlay = document.getElementById('edit-profile-overlay');
const editProfileCloseBtn = document.getElementById('edit-profile-close');
const editProfileCancelBtn = document.getElementById('edit-profile-cancel-btn');
const firstNameInput = document.getElementById('first-name-input')
const lastNameInput = document.getElementById('last-name-input')
const zipInput = document.getElementById('zip-input')
const cityInput = document.getElementById('city-input')
const stateInput = document.getElementById('state-input')
const countrySelect = document.getElementById('country-select')
const genderSelect = document.getElementById('gender-select')
const phoneInput = document.getElementById('phone-input')
const emailModal = document.getElementById('email-modal')
const emailModalOverlay = document.getElementById('email-modal-overlay')
const emailModalClose = document.getElementById('email-modal-close')


document.addEventListener('DOMContentLoaded', () => {
    getUserInfo();
    setupEventListeners();
});

function setupEventListeners() {

    editProfileCloseBtn.addEventListener('click', () => {
        editProfileModal.classList.remove('active');
        editProfileOverlay.classList.remove('active');
        document.body.style.overflow = 'visible'
    });

    editProfileCancelBtn.addEventListener('click', () => {
        editProfileModal.classList.remove('active');
        editProfileOverlay.classList.remove('active');
        document.body.style.overflow = 'visible'
    });

    editProfileOverlay.addEventListener('click', () => {
        editProfileModal.classList.remove('active');
        editProfileOverlay.classList.remove('active');
        document.body.style.overflow = 'visible'
    });

    emailModalClose.addEventListener('click', () => {
        emailModal.classList.remove('active')
        emailModalOverlay.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    emailModalOverlay.addEventListener('click', () => {
        emailModal.classList.remove('active')
        emailModalOverlay.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

};

async function getUserInfo(){
    const settingsGreeting = document.getElementById('settings-greeting')
    const userEmail = document.getElementById('user-email')
    const emailActions = document.getElementById('email-actions')
    const profileSection = document.getElementById('profile-section')
    const profileInfoContainer =  document.getElementById('profile-info-container')

    try{
        const response = await fetch(`${API_BASE}/profile`, {
            credentials: "include"
        })

        if(!response.ok){
            window.location.href = "/frontend/guest/index.html"
            return
        }

        const user = await response.json();

        // settingsGreeting.textContent = `Hi ${user.user.first_name}`

        settingsGreeting.innerHTML = `Hi, <span class="greeting-name">${user.user.first_name}</span>`;

        const fullName = `${user.user.first_name} ${user.user.last_name}`

        profileInfoContainer.innerHTML = `
            <div class="profile-info-item" id="profile-name-item">
                <svg class="profile-info-icon" id="profile-name-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span class="profile-info-data" id="profile-name">${escapeHtml(fullName)}</span>
            </div>

            <div class="profile-info-item" id="profile-address-item">
                <svg class="profile-info-icon" id="profile-location-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span class="profile-info-data" id="profile-country">${escapeHtml(user.user.country) || "N/A"}</span>
            </div>

            <div class="profile-info-item" id="profile-phone-item">
                <svg class="profile-info-icon" id="profile-phone-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <span class="profile-info-data" id="profile-phone">${escapeHtml(user.user.phone || "N/A")}</span>
            </div>

            <button class="edit-profile-button" id="edit-profile-button">Edit profile</button>
        `
        profileSection.appendChild(profileInfoContainer)

        userEmail.textContent = user.user.email

        if(user.user.email_verified){
            emailActions.innerHTML = `
                <a class="email-action-link" id="change-email-link">Change email</a>
            `
        }else{
            emailActions.innerHTML = `
                <div class="email-actions-links">
                    <a class="email-action-link" id="verify-email-link">Verify email</a>
                    <a class="email-action-link" id="change-email-link">Change email</a>
                </div>
                <div class="profile-resend-cooldown" id="profile-resend-cooldown">
                    <p>You can resend in <span id="countdown-timer">60</span> seconds</p>
                </div>
            `

            const verifyEmail = document.getElementById("verify-email-link");
            verifyEmail.addEventListener('click', () => {
                resendVerification(user.user.email)
            })

            resendCooldown(user.user.email)
        }

        // Select the trigger button (e.g., "Edit profile" button)
        const editProfileBtn = document.getElementById('edit-profile-button');
        editProfileBtn.addEventListener('click', () => {
            editProfileModal.classList.add('active');
            editProfileOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'
            populateProfileForm(user)
        });

        const changeEmail = document.getElementById('change-email-link')
        changeEmail.addEventListener('click', () =>  {
            emailModal.classList.add('active')
            emailModalOverlay.classList.add('active')
            document.body.style.overflow = 'hidden'
        })

    }catch(error){
        console.error("Auth check failed:", error)
        reloadWithToast("Login failed", "error", "/frontend/guest/index.html")
        return
    }
}

function populateProfileForm(user){
    firstNameInput.value = user.user.first_name
    lastNameInput.value = user.user.last_name
    zipInput.value = user.user.zip || ""
    cityInput.value = user.user.city || ""
    stateInput.value = user.user.state || ""
    countrySelect.value = user.user.country || ""
    genderSelect.value = user.user.gender || ""
    phoneInput.value = user.user.phone ||  ""
}

async function resendVerification(email) {
    try {
        const verifyEmail = document.getElementById("verify-email-link");

        verifyEmail.style.pointerEvents = "none"
        verifyEmail.style.opacity = "0.5"

        const freshToken = await window.refreshCsrfToken();
        if (!freshToken) {
            showToast("Security token expired. Please refresh the page.", "error");
            verifyEmail.style.pointerEvents = "auto"
            verifyEmail.style.opacity = "1"
            return;
        }

        const response = await fetch(`/auth/resend-verification`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": freshToken,
            },
            credentials: "include",
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Verification email sent! Please check your inbox.", "success");
            verifyEmail.style.pointerEvents = "auto"
            verifyEmail.style.opacity = "1"

            resendCooldown(email)
        }else {
            // Check if email is already verified
            if (data.alreadyVerified) {
                showToast("Email already verified.", "info");
            } else {
                showToast("Failed to resend email", "error");
            }

            verifyEmail.style.pointerEvents = "auto"
            verifyEmail.style.opacity = "1"
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Failed to resend verification email", "error");
        verifyEmail.style.pointerEvents = "auto"
        verifyEmail.style.opacity = "1"
    }
};

async function resendCooldown(email){
    const resendBtn = document.getElementById("verify-email-link");
    const cooldownDiv = document.getElementById("profile-resend-cooldown");
    const countdownTimer = document.getElementById("countdown-timer");
    
    if(!resendBtn || !cooldownDiv || !countdownTimer) return;

    try {
        const response = await fetch(`/auth/check-cooldown?email=${encodeURIComponent(email)}`, {
            credentials: "include"
        });
        
        const data = await response.json();

        let secondsRemaining = data.remainingSeconds
        
        if (secondsRemaining) {
            resendBtn.style.pointerEvents = "none";
            resendBtn.style.opacity = "0.5"
            cooldownDiv.style.display = "block";
            countdownTimer.textContent = secondsRemaining;

            const cooldownInterval = setInterval(() => {
                secondsRemaining--;
                countdownTimer.textContent = secondsRemaining;

                if (secondsRemaining <= 0) {
                    clearInterval(cooldownInterval);
                    cooldownDiv.style.display = "none";
                    resendBtn.style.pointerEvents = "auto";
                    resendBtn.style.opacity = "1"
                }
            }, 1000);
        }
    } catch (error) {
        console.error("Failed to check cooldown:", error);
    }
}