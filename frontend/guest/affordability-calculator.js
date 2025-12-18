// Affordability Calculator JavaScript

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

async function setupEventListeners() {
    const incomeDefaultValue = '100,000';
    const debtDefaultValue = '0';
    const locationDefaultValue = 'Los Angeles, CA';
    const fundsDefaultValue = '240,000';

    document.querySelectorAll('.clear-btn').forEach(btn => btn.addEventListener('click', () => {
        const inputWrapper = btn.closest('.input-wrapper');
        const formInput = inputWrapper.querySelector('.form-input')

        formInput.value = '';
        formInput.focus();
    }));

    document.querySelectorAll('.form-input').forEach(input => input.addEventListener('blur', () => {
        const inputWrapper = input.closest('.input-wrapper');
        const formInput = inputWrapper.querySelector('.form-input')

        if (formInput.value.trim() === '' && formInput.classList.contains('annual-income')) {
            formInput.value = incomeDefaultValue;
        }else if(formInput.value.trim() === '' && formInput.classList.contains('monthly-debt')) {
            formInput.value = debtDefaultValue;
        }else if(formInput.value.trim() === '' && formInput.classList.contains('location')) {
            formInput.value = locationDefaultValue;
        }else if(formInput.value.trim() === '' && formInput.classList.contains('available-funds')) {
            formInput.value = fundsDefaultValue;
        }
    }));

    document.getElementById('affordabilityForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm();
    })

    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling

            header.classList.toggle('collapsed')
            if(content && content.classList.contains('accordion-content')){
                content.classList.toggle('collapsed')
            }
        });
    });
}


async function submitForm(){

    const formData = {
        annualIncome: document.getElementById('annualIncome').value,
        monthlyDebt: document.getElementById('monthlyDebt').value,
        location: document.getElementById('location').value,
        availableFunds: document.getElementById('availableFunds').value,
        militaryService: document.getElementById('militaryService').checked
    }

    try {
        const response = await fetch('/public/affordability-calculator', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(formData)
        })

        const result = await response.json();

        console.log(result)

        if (result.result_ranges && result.result_ranges.length > 0) {
            showAffordabilityResult(formData, result)
            
        } else {
           showToast("Could not determine affordability. Check your inputs.");
        }

    }catch(error) {
        console.error("Error submitting affordabilty calculator form:", error)
        showToast("Failed to submit form. Please try again later.", "error")
    }
};


function showAffordabilityResult(formData, result) {

    const affordabilityCardContainer = document.getElementById('affordability-card-container')
    affordabilityCardContainer.style.display = 'none'

    const affordabilityCard = document.getElementById('affordability-card')

    const existingResult = affordabilityCard.querySelector('.affordability-result');
    if (existingResult) {
        existingResult.remove();
    }

    const affordabilityResult = document.createElement('div')
    affordabilityResult.classList.add('affordability-result')
    affordabilityResult.innerHTML = `
        <h2 class="affordability-result-header">Your buying power in ${result.location}</h2>
        <div class="edit-container" id="edit-container">
            <i class="bi bi-pencil edit-icon"></i>
            <span class="edit-text">Edit</span>
        </div>
        <div class="affordability-result-content"></div>
        <div class="affordability-btn-container">
            <button class="affordability-btn-container">Add to profile</button>
        </div>
    `
    affordabilityCard.appendChild(affordabilityResult)

    const resultContainer = affordabilityResult.querySelector('.affordability-result-content');
    resultContainer.innerHTML = '';

    result.result_ranges.forEach(tier => {
        const min = tier.min_price.toLocaleString();
        const max = tier.max_price.toLocaleString();

        const html = `
            <div class="affordability-result-item">
                <span class="affordability-label">${tier.label}</span>
                <span class="affordability-price-range">$${min} - $${max}</span>
                <span class="affordability-budget">${tier.budget_status}</span>
            </div>
        `;
        // console.log(html)
        resultContainer.innerHTML += html;
    });

    const editContainer = document.getElementById('edit-container')
    editContainer.addEventListener('click', () => {
        affordabilityCardContainer.style.display = 'block'
        affordabilityResult.style.display = 'none'
        form.reset();

        document.getElementById('annualIncome').value = formData.annualIncome
        document.getElementById('monthlyDebt').value = formData.monthlyDebt
        document.getElementById('location').value = formData.location
        document.getElementById('availableFunds').value = formData.availableFunds
        document.getElementById('militaryService').checked = formData.militaryService

    });
}


// // Clear button functionality
// function initClearButtons() {
//     const clearButtons = document.querySelectorAll('.clear-btn');
    
//     clearButtons.forEach(button => {
//         button.addEventListener('click', () => {
//             const targetId = button.getAttribute('data-clear');
//             const inputField = document.getElementById(targetId);
            
//             if (inputField) {
//                 inputField.value = '';
//                 inputField.focus();
//             }
//         });
//     });
// }

// // Optional: Format currency inputs as user types
// document.querySelectorAll('.form-input').forEach(input => {
//     if (input.id !== 'location') {
//         input.addEventListener('input', (e) => {
//             let value = e.target.value.replace(/,/g, '');
            
//             if (!isNaN(value) && value !== '') {
//                 e.target.value = Number(value).toLocaleString();
//             }
//         });
//     }
// });