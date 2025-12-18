const resetPasswordLink = document.getElementById('reset-password-link')
const changePasswordLink = document.getElementById('change-password-link')
const passwordResetModalOverlay = document.getElementById('password-reset-modal-overlay')
const passwordResetModal = document.getElementById('password-reset-modal')
const passwordResetModalClose = document.getElementById('password-reset-modal-close')
const passwordResetModalCloseBtn = document.getElementById('password-reset-modal-close-btn')
const changePasswordModal = document.getElementById('change-password-modal')
const changePasswordModalClose = document.getElementById('change-password-modal-close')
const changePasswordCancelLink = document.getElementById('change-password-cancel-link')
const newPasswordEyeOpen = document.getElementById('new-password-eye-open')
const newPasswordEyeClosed = document.getElementById('new-password-eye-closed')
const confirmPasswordEyeOpen = document.getElementById('confirm-password-eye-open')
const confirmPasswordEyeClosed = document.getElementById('confirm-password-eye-closed')
const newPassword = document.getElementById("new-password-input")
const confirmPassword = document.getElementById("confirm-password-input")
const passwordModalForm = document.getElementById('password-modal-form')
const passwordModalBackBtn = document.getElementById("password-modal-back-btn")
const passwordModalSubmitBtn = document.getElementById("password-modal-submit-btn")
const changePasswordForm = document.getElementById("change-password-form")
const changePasswordInput = document.querySelectorAll(".change-password-input")
const changePasswordHint = document.querySelectorAll(".change-password-hint")
const changePasswordSubmitBtn = document.getElementById('change-password-submit-btn')

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~]{8,}$/;

changePasswordInput.forEach((input, index) => {
    const hint = changePasswordHint[index];
  
    input.addEventListener('input', () => {
        const password = input.value.trim();
    
        if (!passwordPattern.test(password)) {
            hint.style.color = 'red';
            input.style.border = '1px solid red';
        } else {
            hint.style.color = '#666';
            input.style.border = '2px solid #e0e0e0';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    setupPasswordEventListeners();
});

function setupPasswordEventListeners() {

    resetPasswordLink.addEventListener("click", () => {
        sendResetPasswordLink();
        passwordResetModalOverlay.classList.add('active')
        passwordResetModal.classList.add('active')
        document.body.style.overflow = 'hidden'
    })

    passwordResetModalClose.addEventListener('click', () => {
        passwordResetModal.classList.remove('active')
        passwordResetModalOverlay.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    passwordResetModalCloseBtn.addEventListener('click', () => {
        passwordResetModal.classList.remove('active')
        passwordResetModalOverlay.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    passwordResetModalOverlay.addEventListener('click', () => {
        passwordResetModal.classList.remove('active')
        passwordResetModalOverlay.classList.remove('active')
        changePasswordModal.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    changePasswordLink.addEventListener('click', () => {
        passwordResetModalOverlay.classList.add('active')
        changePasswordModal.classList.add('active')
        document.body.style.overflow = 'hidden'
    })
    
    changePasswordModalClose.addEventListener('click', () => {
        passwordResetModalOverlay.classList.remove('active')
        changePasswordModal.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    changePasswordCancelLink.addEventListener('click', () => {
        passwordResetModalOverlay.classList.remove('active')
        changePasswordModal.classList.remove('active')
        document.body.style.overflow = 'visible'
    })

    newPasswordEyeOpen.addEventListener('click', () => {
        newPasswordEyeClosed.style.display = 'block'
        newPasswordEyeOpen.style.display = 'none'
        newPassword.type = "text"
        newPassword.focus()
    })

    newPasswordEyeClosed.addEventListener('click', () => {
        newPasswordEyeClosed.style.display = 'none'
        newPasswordEyeOpen.style.display = 'block'
        newPassword.type = "password"
        newPassword.focus()
    })

    confirmPasswordEyeOpen.addEventListener('click', () => {
        confirmPasswordEyeClosed.style.display = 'block'
        confirmPasswordEyeOpen.style.display = 'none'
        confirmPassword.type = "text"
        confirmPassword.focus()
    })

    confirmPasswordEyeClosed.addEventListener('click', () => {
        confirmPasswordEyeClosed.style.display = 'none'
        confirmPasswordEyeOpen.style.display = 'block'
        confirmPassword.type = "password"
        confirmPassword.focus()
    })

    changePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault()
        submitChangePasswordForm();
    })
};

async function sendResetPasswordLink(){
    try{

        const getUser = await fetch(`${API_BASE}/profile`, {
            credentials: "include"
        })

        if(!getUser.ok){
            throw new Error('Failed to get user email. Kindly relogin.')
        }

        const user = await getUser.json()
        const userId = user.user.id

        document.getElementById('password-reset-modal-email').textContent = user.user.email

        const response = await fetch(`${API_BASE}/password-reset/request`, {
            method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": window.getCsrfToken(),
			},
			credentials: "include",
			body: JSON.stringify({userId}),
        })

        if(!response.ok){
            throw new Error('Failed to send password reset link')
        }

    }catch(error){
        console.error(error)
        showToast("Failed to send password reset link. Please try again later.")
    }
}
  
async function submitChangePasswordForm(){
    const newPasswordValue = newPassword.value
    const confirmPasswordValue = confirmPassword.value
    
    try {

        if(!newPasswordValue || !confirmPasswordValue ){
            showToast('Please fill all fields', 'error')
            return;
        }

        if (!passwordPattern.test(newPasswordValue)) {
            changePasswordHint.forEach(hint => {
                hint.style.color = 'red'
            })
            changePasswordInput.forEach(input => {
                input.style.border = '1px solid red';
            })
            return;
        }

        changePasswordSubmitBtn.textContent = "Changing password..."
        changePasswordSubmitBtn.disabled = true
        
        const formData = { newPasswordValue, confirmPasswordValue }

        const response = await fetch(`${API_BASE}/change-password/submit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(formData)
        });

        const data = await response.json()

        if(!response.ok){
            if(data.incompleteFields){
                showToast(data.message, "error")
                changePasswordSubmitBtn.textContent = "Submit"
                changePasswordSubmitBtn.disabled = false
                return
            }

            if(data.noMatch){
                showToast(data.message, "error")
                changePasswordSubmitBtn.textContent = "Submit"
                changePasswordSubmitBtn.disabled = false
                return
            }

            if(data.errors){
                showToast(data.errors[0].message, "error");
                changePasswordSubmitBtn.textContent = "Submit"
                changePasswordSubmitBtn.disabled = false
                return
            }

            throw new Error('Failed to change password')
        }

        changePasswordSubmitBtn.textContent = "Submit"
        changePasswordSubmitBtn.disabled = true

        reloadWithToast(data.message, "success")

    }catch(error){
        console.error(error)
        changePasswordSubmitBtn.textContent = "Submit"
        changePasswordSubmitBtn.disabled = false
        showToast("Failed to reset password. Please try again later.", "error")
    }
}