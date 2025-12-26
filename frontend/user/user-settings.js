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
    getBuyerProfileInfo();
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

    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const newUrl = new URL(window.location);
            newUrl.searchParams.set('tab', targetTab);
            window.history.replaceState({}, '', newUrl);

            contents.forEach(content => content.classList.remove('active'));
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    if (activeTab) {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const tabToActivate = document.querySelector(`[data-tab="${activeTab}"]`);
        const contentToActivate = document.querySelector(`[data-content="${activeTab}"]`);
        
        if (tabToActivate && contentToActivate) {
            tabToActivate.classList.add('active');
            contentToActivate.classList.add('active');
        }
    }
};

async function getBuyerProfileInfo(){
    try {
        const response = await fetch(`${API_BASE}/buyer-profile`, {
            credentials: "include"
        })

        if(!response.ok){
            throw new Error("Failed to get buyer's profile")
        }

        const result = await response.json()

        const buyerProfileSection = document.getElementById('buyer-profile-section')
        const buyerProfileContainer = document.createElement('div')
        buyerProfileContainer.classList.add('buyer-profile-container')
        buyerProfileContainer.innerHTML = `
            <div class="buyer-profile-info">
                <div class="buyer-profile-item-header">
                    <h2 class="buyer-profile-item-title">Annual household income</h2>
                    <p class="buyer-profile-item-description">Total annual income before taxes for you and your household members.</p>
                </div>
                
                <!-- Display Mode -->
                <div class="buyer-profile-display-container active">
                    <span class="buyer-profile-display-value" id="buyer-profile-annual-household-income">$${Math.round(result.annual_household_income).toLocaleString()}</span>
                    <button class="buyer-profile-edit-btn" id="income-edit-btn" data-btn="income">Edit</button>
                </div>

                <!-- Edit Mode -->
                <div class="buyer-profile-edit-form" data-form="income">
                    <div class="buyer-profile-input-wrapper">
                        <span class="buyer-profile-currency-symbol">$</span>
                        <input 
                            type="text" 
                            class="buyer-profile-input-field buyer-profile-input-with-currency" 
                            id="buyer-profile-income-input"
                            value="${Math.round(result.annual_household_income).toLocaleString()}"
                        >
                        <button class="buyer-profile-clear-btn">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="buyer-profile-form-actions">
                        <button class="buyer-profile-cancel-btn">Cancel</button>
                        <button class="buyer-profile-save-btn" data-field="annual_household_income">Save</button>
                    </div>
                </div>
            </div>

            <!-- Monthly Debt Section -->
            <div class="buyer-profile-info">
                <div class="buyer-profile-item-header">
                    <h2 class="buyer-profile-item-title">Monthly debt</h2>
                    <p class="buyer-profile-item-description">Payments you make for loans or other debt, but not living expenses like rent, groceries or utilities.</p>
                </div>
                
                <!-- Display Mode -->
                <div class="buyer-profile-display-container active">
                    <span class="buyer-profile-display-value" id="buyer-profile-monthly-debt">$${Math.round(result.monthly_debt).toLocaleString()}</span>
                    <button class="buyer-profile-edit-btn" id="debt-edit-btn" data-btn="debt">Edit</button>
                </div>

                <!-- Edit Mode -->
                <div class="buyer-profile-edit-form" data-form="debt">
                    <div class="buyer-profile-input-wrapper">
                        <span class="buyer-profile-currency-symbol">$</span>
                        <input 
                            type="text" 
                            class="buyer-profile-input-field buyer-profile-input-with-currency" 
                            id="buyer-profile-debt-input"
                            value="${Math.round(result.monthly_debt).toLocaleString()}"
                        >
                        <button class="buyer-profile-clear-btn">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="buyer-profile-form-actions">
                        <button class="buyer-profile-cancel-btn">Cancel</button>
                        <button class="buyer-profile-save-btn" data-field="monthly_debt">Save</button>
                    </div>
                </div>
            </div>

            <!-- Available Funds Section -->
            <div class="buyer-profile-info">
                <div class="buyer-profile-item-header">
                    <h2 class="buyer-profile-item-title">Available funds</h2>
                    <p class="buyer-profile-item-description">Money that you can spend on the down payment and closing costs.</p>
                </div>
                
                <!-- Display Mode -->
                <div class="buyer-profile-display-container active">
                    <span class="buyer-profile-display-value" id="buyer-profile-available-funds">$${Math.round(result.available_funds).toLocaleString()}</span>
                    <button class="buyer-profile-edit-btn" id="funds-edit-btn" data-btn="funds">Edit</button>
                </div>

                <!-- Edit Mode -->
                <div class="buyer-profile-edit-form" data-form="funds">
                    <div class="buyer-profile-input-wrapper">
                        <span class="buyer-profile-currency-symbol">$</span>
                        <input 
                            type="text" 
                            class="buyer-profile-input-field buyer-profile-input-with-currency" 
                            id="buyer-profile-funds-input"
                            value="${Math.round(result.available_funds).toLocaleString()}"
                        >
                        <button class="buyer-profile-clear-btn">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="buyer-profile-form-actions">
                        <button class="buyer-profile-cancel-btn">Cancel</button>
                        <button class="buyer-profile-save-btn" data-field="available_funds">Save</button>
                    </div>
                </div>
            </div>

            <!-- Veteran Status Section -->
            <div class="buyer-profile-info">
                <div class="buyer-profile-item-header">
                    <h2 class="buyer-profile-item-title">Veteran status</h2>
                    <p class="buyer-profile-item-description">Have you or your spouse served in the U.S. Military?</p>
                </div>
                
                <!-- Display Mode -->
                <div class="buyer-profile-display-container active">
                    <span class="buyer-profile-display-value" id="buyer-profile-veteran-status">${result.veteran_status ? 'Veteran' : 'Not a Veteran'}</span>
                    <button class="buyer-profile-edit-btn" id="veteran-edit-btn" data-btn="veteran">Edit</button>
                </div>

                <!-- Edit Mode -->
                <div class="buyer-profile-edit-form" data-form="veteran">
                    <div class="buyer-profile-input-wrapper">
                        <select class="buyer-profile-input-field" id="buyer-profile-veteran-input" data-field="veteran_status">
                            <option value="false" ${!result.veteran_status ? 'selected' : ''}>Not a Veteran</option>
                            <option value="true" ${result.veteran_status ? 'selected' : ''}>Veteran</option>
                        </select>
                    </div>
                    <div class="buyer-profile-form-actions">
                        <button class="buyer-profile-cancel-btn">Cancel</button>
                        <button class="buyer-profile-save-btn" data-field="veteran_status">Save</button>
                    </div>
                </div>
            </div>

            <!-- Footer Note -->
            <div class="buyer-profile-footer-note">
                The personal data presented on this page is collected according to the primehomes.com 
                <a href="#" class="buyer-profile-footer-link">Privacy Policy</a>.
            </div>
        `
        buyerProfileSection.appendChild(buyerProfileContainer)
        buyerProfileEventListeners();

    }catch(error){
        console.error("Failed to get buyer's profile:", error)
        showToast('Error getting buyer profile', 'error')
    }
}

function buyerProfileEventListeners(){
    const editBtns = document.querySelectorAll('.buyer-profile-edit-btn');

    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetField = btn.dataset.btn;

            // t.classList.remove('active')
            const buyerProfileDisplayContainer = btn.closest('.buyer-profile-display-container')
            buyerProfileDisplayContainer.classList.remove('active')
            const buyerProfileInfo = btn.closest('.buyer-profile-info')
            const input = buyerProfileInfo.querySelector('.buyer-profile-input-field')
            input.focus();
            
            const targetContent = document.querySelector(`[data-form="${targetField}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    const cancelBtn = document.querySelectorAll('.buyer-profile-cancel-btn')
    cancelBtn.forEach(btn => btn.addEventListener('click', () => {
        const parentContainer = btn.closest('.buyer-profile-edit-form')
        parentContainer.classList.remove('active')

        const grandParentContainer = parentContainer.closest('.buyer-profile-info')
        const buyerProfileDisplayContainer = grandParentContainer.querySelector('.buyer-profile-display-container')
        buyerProfileDisplayContainer.classList.add('active')
    }))

    const clearBtn = document.querySelectorAll('.buyer-profile-clear-btn')
    clearBtn.forEach(btn => btn.addEventListener('click', () => {
        const parentContainer = btn.closest('.buyer-profile-input-wrapper')
        const input = parentContainer.querySelector('.buyer-profile-input-field');
        input.value = '';
        input.focus();

    }))

    const saveBtns = document.querySelectorAll('.buyer-profile-save-btn');
    saveBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const field = btn.dataset.field;
            const parentContainer = btn.closest('.buyer-profile-edit-form');
            const input = parentContainer.querySelector('.buyer-profile-input-field');
            let inputValue = input.value.trim();

            // Remove commas for currency fields
            if(['annual_household_income', 'monthly_debt', 'available_funds'].includes(field)) {
                inputValue = inputValue.replace(/,/g, '');
            }

            // Convert veteran_status to boolean
            if(field === 'veteran_status') {
                inputValue = inputValue === 'true';
            }

            await saveBuyerProfileValue(field, inputValue, parentContainer);
        });
    });

    // Format currency inputs with commas as user types
    const currencyInputs = document.querySelectorAll('.buyer-profile-input-with-currency');
    currencyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                value = parseInt(value).toLocaleString();
            }
            e.target.value = value;
        });
    });
}

async function saveBuyerProfileValue(field, value, formContainer) {
    try {
        const response = await fetch(`${API_BASE}/buyer-profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': window.getCsrfToken()
            },
            credentials: 'include',
            body: JSON.stringify({ [field]: value })
        });

        if(!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        const displayValue = document.getElementById(`buyer-profile-${field.replace('_', '-')}`);
        
        if(['annual_household_income', 'monthly_debt', 'available_funds'].includes(field)) {
            displayValue.textContent = value ? '$' + parseInt(value).toLocaleString() : 'Not set';
        } else if(field === 'veteran_status') {
            displayValue.textContent = value ? 'Veteran' : 'Not a Veteran';
        }

        // Hide form, show display
        formContainer.classList.remove('active');
        const grandParent = formContainer.closest('.buyer-profile-info');
        const displayContainer = grandParent.querySelector('.buyer-profile-display-container');
        displayContainer.classList.add('active');

        showToast('Profile updated successfully', 'success');

    } catch(error) {
        console.error('Error saving buyer profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

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