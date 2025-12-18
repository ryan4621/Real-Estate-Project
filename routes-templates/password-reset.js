document.addEventListener('DOMContentLoaded', () => {
    setUpEventListeners()
});

const newPasswordEyeOpen = document.getElementById('new-password-eye-open')
const newPasswordEyeClosed = document.getElementById('new-password-eye-closed')
const confirmPasswordEyeOpen = document.getElementById('confirm-password-eye-open')
const confirmPasswordEyeClosed = document.getElementById('confirm-password-eye-closed')
const newPassword = document.getElementById("new-password-input")
const confirmPassword = document.getElementById("confirm-password-input")
const passwordModalForm = document.getElementById('password-modal-form')
const passwordModalBackBtn = document.getElementById("password-modal-back-btn")
const passwordModalSubmitBtn = document.getElementById("password-modal-submit-btn")
const passwordModalInput = document.querySelectorAll(".password-modal-input")
const passwordModalHint = document.querySelectorAll(".password-modal-hint")

function setUpEventListeners(){
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

    passwordModalForm.addEventListener('submit', (e) => {
        e.preventDefault()
        submitResetPasswordForm();
    })

    passwordModalBackBtn.addEventListener('click', () => {
        window.location.href = "/frontend/guest/index.html"
    })
}

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{};:'",.<>\/\\|`~]{8,}$/;

passwordModalInput.forEach((input, index) => {
    const hint = passwordModalHint[index];
  
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

async function submitResetPasswordForm(){
    const newPasswordValue = newPassword.value
    const confirmPasswordValue = confirmPassword.value
    
    try {

        const URLParams = new URLSearchParams(window.location.search);
	    const resetToken = URLParams.get("token");

        if(!newPasswordValue || !confirmPasswordValue ){
            showToast('Please fill all fields', 'error')
            return;
        }

        if (!passwordPattern.test(newPasswordValue)) {
            passwordModalHint.forEach(hint => {
                hint.style.color = 'red'
            })
            passwordModalInput.forEach(input => {
                input.style.border = '1px solid red';
            })
            return;
        }

        passwordModalSubmitBtn.textContent = "Reseting password..."
        passwordModalSubmitBtn.disabled = true

        const formData = { newPasswordValue, confirmPasswordValue, resetToken }

        const response = await fetch('/api/password-reset/submit', {
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
                passwordModalSubmitBtn.textContent = "Submit"
                passwordModalSubmitBtn.disabled = false
                return
            }

            if(data.noMatch){
                showToast(data.message, "error")
                passwordModalSubmitBtn.textContent = "Submit"
                passwordModalSubmitBtn.disabled = false
                return
            }

            if(data.errors){
                showToast(data.errors[0].message, "error");
                passwordModalSubmitBtn.textContent = "Submit"
                passwordModalSubmitBtn.disabled = false
                return
            }

            throw new Error('Failed to reset password')
        }

        passwordModalSubmitBtn.textContent = "Submit"
        passwordModalSubmitBtn.disabled = true

        replaceWithToast(data.message, "success", "/frontend/guest/index.html")

    }catch(error){
        console.error(error)
        passwordModalSubmitBtn.textContent = "Submit"
        passwordModalSubmitBtn.disabled = false
        showToast("Failed to reset password. Please try again later.", "error")
    }
}