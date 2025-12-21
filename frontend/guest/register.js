// register.js
document.addEventListener('DOMContentLoaded', async () => {
    setUpSigninEventListeners();
    fetchCountries();
});

function setUpSigninEventListeners() {
    const signUpForm = document.querySelector('.signup-form')

    document.querySelector('.nav-signup-btn').addEventListener('click', openSignupModal)
    document.querySelector('.signup-close-modal').addEventListener('click', closeSignupModal)

    document.querySelector('.signup-overlay').addEventListener('click', closeSignupModal)
    signUpForm.querySelector('.continue-btn').addEventListener('click', continueSignin);

    signUpForm.querySelector('.login-btn').addEventListener('click', login);
    signUpForm.addEventListener('submit', signup);

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value.trim()

        if(!passwordPattern.test(password)){
            passwordP.style.display = 'block';
            passwordInput.style.border = '1px solid red';
            
        }else{
            passwordP.style.display = 'none'
            passwordInput.style.border = '2px solid #e0e0e0';
        }
    })

    const passwordIcon = passwordInputGroup.querySelectorAll('i')
    const closeEye = passwordIcon[0]
    const openEye = passwordIcon[1]
    passwordIcon.forEach((icon) => {
        icon.addEventListener('click', (e) => {
            e.preventDefault()

            const passwordType = passwordInputGroup.querySelector('.password')

            if(passwordType.type === "password"){
                passwordType.type = "text"
                closeEye.style.display = "none"
                openEye.style.display = "block"
            }else {
                passwordType.type = "password"
                closeEye.style.display = "block"
                openEye.style.display = "none"
            }
        })
    })
}

const signUpModal = document.querySelector('.signup-modal')
const signUpForm = signUpModal.querySelector('.signup-form')
const emailInput = signUpForm.querySelector('.email')
const continueBtn = signUpForm.querySelector('.continue-btn')
const passwordInputGroup = signUpForm.querySelector('.password-input-group')
const passwordInput = passwordInputGroup.querySelector('.password');
const paragraphs = signUpForm.querySelectorAll('p')
const emailP = paragraphs[0]
const passwordP = paragraphs[1]
const loginBtn = signUpForm.querySelector('.login-btn')
// const navbarContainer = document.getElementById('navbar-container')
const signupBtn = signUpForm.querySelector('.signup-btn')
const firstNameInputGroup = signUpForm.querySelector('.first-name-input-group')
const lastNameInputGroup = signUpForm.querySelector('.last-name-input-group')
const genderInputGroup = signUpForm.querySelector('.gender-input-group')
const countryInputGroup = signUpForm.querySelector('.country-input-group')
const modalTitle = document.querySelector('.signup-modal-title')
const signUpOverlay = document.querySelector('.signup-overlay')
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// function googleLogin() {
//     google.accounts.id.initialize({
//         client_id: '123778486490-cfi70h5c6l9rtn2vkr517j7q86nvk2m0.apps.googleusercontent.com',
//         callback: handleGoogleLogin
//     });
    
//     // Trigger Google's One Tap or popup
//     google.accounts.id.prompt();
// }

window.handleGoogleLogin = async function(response) {
    try {
        // Google sends back a JWT token in response.credential
        const res = await fetch('/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (res.ok) {
            console.log('Login successful:', data);
            window.location.reload();
        } else {
            showToast(data.message || 'Error logging in', 'error')
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Login failed', 'error')
    }
}


//Continue

function openSignupModal(){
    signUpModal.classList.add('active')
    signUpOverlay.classList.add('active')
    document.body.style.overflow = 'hidden'
}

function closeSignupModal(){
    signUpModal.classList.remove('active')
    signUpOverlay.classList.remove('active')
    document.body.style.overflow = ''
}

function emailInputError(){
    emailInput.addEventListener('input', () =>{
        const email = emailInput.value.trim()
        if(emailPattern.test(email)){
            emailP.style.display = 'none'
            emailInput.style.border = '2px solid #e0e0e0';
        }else{
            emailP.textContent = 'Enter a valid email address';
            emailP.style.display = 'block';
            emailInput.style.border = '1px solid red';
        }
    })
}

async function continueSignin(e){
    e.preventDefault();

    emailInputError();

    const email = emailInput.value.trim()

    if(!email){
        emailP.textContent = 'Enter your email address'
        emailP.style.display = 'block'
        emailInput.style.border = '1px solid red';
        return;
    }

    if(email && !emailPattern.test(email)){
        console.log('Enter a valid email')
        emailP.style.display = 'block'
        emailInput.style.border = '1px solid red';
        return;
    }

    emailP.style.display = 'none';
    emailInput.style.border = '2px solid #e0e0e0';

    const loginData = { email }
    
    try{
        const response = await fetch('/auth/check-email', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: "include",
            body: JSON.stringify(loginData)
        })

        const data = await response.json();

        if(data.exists){
            emailInput.disabled = true;
            passwordInputGroup.style.display = 'block'
            loginBtn.style.display = "block"
            continueBtn.style.display = "none"
            modalTitle.textContent = "Login"
            return
        }

        if(!data.exists){
            emailInput.disabled = true;
            firstNameInputGroup.style.display = 'block'
            lastNameInputGroup.style.display = 'block'
            passwordInputGroup.style.display = 'block'
            genderInputGroup.style.display = 'block'
            countryInputGroup.style.display = 'block'
            continueBtn.style.display = "none"
            loginBtn.style.display = "none"
            signupBtn.style.display = "block"
            modalTitle.textContent = "Create account"
            return;
        }

    }catch(error){
        console.error("Error:", error)
        showToast('Unknown error. Please try again later.')
    }
}


//Login

async function login(e){
    e.preventDefault();

    console.log('logged in!!!')

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email){
        emailP.textContent = "Enter your email address"
        emailP.style.display = "block"
        emailInput.style.border = "1px solid red"
    }

    if (!emailPattern.test(email)) {
        emailP.style.display = "block"
        emailInput.style.border = "1px solid red"
        return;
    }
    
    if(!password){
        passwordP.textContent = "Enter your password"
        passwordP.style.display = 'block';
        passwordInput.style.border = '1px solid red';
        return;
    }

    if(!passwordPattern.test(password)){
        passwordP.style.display = 'block';
        passwordInput.style.border = '1px solid red';
        return;
    }

    const token = window.getCsrfToken();
    if (!token) {
        console.error("No CSRF token available, refreshing...");
        await window.initCsrfToken();
    }

    const loginData = { email, password } 

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers:  {
                'Content-Type': 'application/json',
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify(loginData)
        })

        const data = await response.json()

        if(!response.ok){

            document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            if(data.emailNotFound){
                showToast("Invalid Credentials", "error")
                return;
            }

            if(data.incorrectPassword){
                showToast("Invalid Credentials", "error")
                return
            }

            // Handle specific account status errors
            if (data.accountStatus === "deactivated") {
                showToast("Account deactivated, contact support for more info", "error");
                return;
            }

            if (data.accountStatus === "suspended") {
                showToast("Account suspended, contact support for more info", "error");
                return;
            }

            if (data.accountStatus === "deleted") {
                showToast("Account deleted, contact support for more info", "error");
                return;
            }

            throw new Error("Login failed. Please try again later.")
        }

        console.log('Login successful')

        if (data.role === "Admin" || data.role === "Super_Admin") {
            window.location.href = "/frontend/admin/admin-dashboard.html"
        } else {
            window.location.reload();
        }

    }catch(error){
        console.error('Error:', error)
        showToast("Error logging in. Please try again later.")
    }
}


//Sign up

async function fetchCountries() {
    const countrySelect = document.querySelector('.country-select')
    countrySelect.innerHTML = `<option selected disabled>Select Country</option>`

    try{
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
}

async function signup(e){
    e.preventDefault();

    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    signupBtn.disabled = true

    const email = emailInput.value.trim()
    const firstName = signUpForm.querySelector('.first-name').value.trim()
    const lastName = signUpForm.querySelector('.last-name').value.trim()
    const password = passwordInput.value.trim()
    const gender = genderInputGroup.querySelector('.gender-select').value
    const country = countryInputGroup.querySelector('.country-select').value

    if(!email || !firstName || !lastName || !password || !gender || !country){
        showToast('Please fill all fields', 'error')
        return;
    }

    if (!passwordPattern.test(password)) {
        passwordP.style.display = 'block';
        passwordInput.style.border = '1px solid red';
        return;
    }

    const registerData = { email, firstName,lastName, password, gender, country }

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify(registerData)
        })

        await response.json();

        if(!response.ok){
            throw new Error("Registration failed")
        }

        // signupBtn.textContent = "Creating account..."
        // showToast('Registration successful', 'success')

        firstNameInputGroup.style.display = 'none'
        lastNameInputGroup.style.display = 'none'
        passwordInputGroup.style.display = 'block'
        genderInputGroup.style.display = 'none'
        countryInputGroup.style.display = 'none'
        loginBtn.style.display = "block"
        signupBtn.style.display = "none"
        modalTitle.textContent = "Login"
        passwordInput.value = ""
        // console.log('Registration successful')

        showVerificationModal(email)

    }catch(error){
        console.error("Error:", error)
        showToast("Error creating account", "error")
    }
}

function resendCooldown(){
    const resendBtn = document.querySelector(".resend-btn");
    const cooldownDiv = document.getElementById("resend-cooldown");
    const countdownTimer = document.getElementById("countdown-timer");
    
    if(!resendBtn || !cooldownDiv || !countdownTimer) return;

    resendBtn.disabled = true;
    // Start cooldown
    cooldownDiv.style.display = "block";
    let secondsRemaining = 60;
    countdownTimer.textContent = secondsRemaining;

    const cooldownInterval = setInterval(() => {
        secondsRemaining--;
        countdownTimer.textContent = secondsRemaining;

        if (secondsRemaining <= 0) {
            clearInterval(cooldownInterval);
            cooldownDiv.style.display = "none";
            resendBtn.disabled = false;
        }
    }, 1000);
}

function showVerificationModal(email) {

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    const safeEmail = escapeHtml(email);

    // Show verification message
    const container = document.querySelector(".signup-modal-content");
    container.innerHTML = `
        <div class="verification-container text-center p-4">
            <div class="verification-icon mb-3">
                <i class="bi bi-envelope-check"></i>
            </div>
            <h3>Verify Your Email</h3>
            <p class="mt-3">We've sent a verification email to:</p>
            <p class="fw-bold">${safeEmail}</p>
            <p class="text-muted mt-3">Please check your inbox and click the verification link to complete your registration.</p>
            <p class="text-muted">The link will expire in 24 hours.</p>
            
            <div class="mt-4">
                <p class="text-muted">Didn't receive the email?</p>
                <button class="btn resend-btn btn-outline-dark">Resend Verification Email</button>
                <div class="resend-cooldown" id="resend-cooldown">
                    <p>You can resend in <span id="countdown-timer">60</span> seconds</p>
                </div>
            </div>
            
            <div class="mt-4">
                <a href="/frontend/guest/index.html" class="text-dark">Return to homepage</a>
            </div>
        </div>
    `;

    const resendBtn = document.querySelector('.resend-btn')
    resendBtn.addEventListener("click", () => {
        resendVerification(email)
    });

    resendCooldown()
    startVerificationCheck(email);
}

async function resendVerification (email) {
    try {
        const resendBtn = document.querySelector(".resend-btn");

        resendBtn.disabled = true;
        resendBtn.textContent = "Resending email...";

        const freshToken = await window.refreshCsrfToken();

        if (!freshToken) {
            showToast("Security token expired. Please refresh the page.", "error");
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend Verification Email";
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
            resendBtn.textContent = "Resend Verification Email";

            resendCooldown()
        } else {
            // Check if email is already verified
            if (data.alreadyVerified) {
                showToast("Email already verified. Please log in to your account.", "info");
            } else {
                showToast("Failed to resend email", "error");
            }
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend Verification Email";
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Failed to resend verification email", "error");
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend Verification Email";
    }
};

function startVerificationCheck(email) {
    let checkCount = 0;
    const checkIntervalTime = 5000;
    const maxDuration = 30 * 60 * 1000;
    const maxChecks = Math.floor(maxDuration / checkIntervalTime);
    const startTime = Date.now();

    const checkInterval = setInterval(async () => {
        checkCount++;
        const elapsedTime = Date.now() - startTime;

        if (checkCount >= maxChecks || elapsedTime >= maxDuration) {
            clearInterval(checkInterval);
            return;
        }

        try {
            // Check if email is verified
            const response = await fetch(
                `/auth/check-verification?email=${encodeURIComponent(email)}`,
                {
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (data.verified) {
                clearInterval(checkInterval);

                // Remove waiting modal
                const container = document.querySelector(".signup-modal-content");
                if (container) {
                    // Show success message
                    container.innerHTML = `
                        <div class="verification-container text-center p-4">
                            <div class="verification-icon mb-3">
                            <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                            </div>
                            <h3>Email Verified!</h3>
                            <p class="mt-3">Your email has been successfully verified.</p>
                            <button class="btn btn-dark mt-3" onclick="window.location.reload()">Continue to Sign In</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error("Verification check error:", error);
        }
    }, checkIntervalTime);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(checkInterval);
    });

    return checkInterval;
}