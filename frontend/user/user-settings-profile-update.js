const editProfileForm = document.getElementById('edit-profile-form')
const editProfileSaveBtn = document.getElementById("edit-profile-save-btn")

document.addEventListener('DOMContentLoaded', () => {
    setupProfileEventListeners();
    selectCountry();
});

async function selectCountry(){
    // const countrySelect = document.getElementById('country-select')
    countrySelect.innerHTML = `<option selected disabled>Select Country</option>`

    try {
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

function setupProfileEventListeners() {

    editProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        updateProfileInfo();
    })
};

async function updateProfileInfo(){

    editProfileSaveBtn.textContent = "Updating..."
    editProfileSaveBtn.disabled = true

    const formData = new FormData(editProfileForm);
	const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(data)   
        });

        if(!response.ok){
            editProfileSaveBtn.textContent = "Save Changes"
            editProfileSaveBtn.disabled = false
            throw new Error("Failed")
        }

        const result = await response.json();

        editProfileSaveBtn.textContent = "Save Changes"
        editProfileSaveBtn.disabled = false
        reloadWithToast(result.message, "success")

    }catch(error){
        console.error('Failed to update profile:', error)
        editProfileSaveBtn.textContent = "Save Changes"
        editProfileSaveBtn.disabled = false
        showToast("Failed to update profile. Please try again later", "error")
    }
}