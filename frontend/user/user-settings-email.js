
const emailModalForm = document.getElementById('email-modal-form')
const emailModalSubmitbtn = document.getElementById('email-modal-submit-btn')

document.addEventListener('DOMContentLoaded', () => {
    setupEmailEventListeners();
});

function setupEmailEventListeners() {

    emailModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        updateEmail();
    })
};

async function updateEmail(){
    emailModalSubmitbtn.textContent = "Sending..."
    const email = document.getElementById('email-modal-input').value

    const emailData = { email }

    console.log(emailData)

    try{
        const response = await fetch(`${API_BASE}/profile/email`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(emailData)
        })

        if(!response.ok){
            throw new Error("Failed")
        }

        const result = await response.json()

        emailModalForm.reset()
        emailModalSubmitbtn.textContent = "Send Email"
        reloadWithToast(result.message, "success")

    }catch(error){
        console.error("Failed to update email address:", error)
        showToast('Failed to update email address. Please try again later.', 'error' )
    }

}