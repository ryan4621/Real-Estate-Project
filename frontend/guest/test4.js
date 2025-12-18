// Pre-Approval Flow Navigation

let currentStep = 0;
let selectedOptions = [];
let priceRangeValue = 300000;
let isTransitioning = false;
let token;
const containers = document.querySelectorAll('.preapproval-home-type, .mortgage-flow-container');

// --- STATE MANAGEMENT using localStorage ---

// Load state from localStorage on initialization
function loadState() {
    const storedStep = localStorage.getItem('mortgageFlowStep');
    const storedOptions = localStorage.getItem('mortgageFlowOptions');
    const storedPrice = localStorage.getItem('mortgageFlowPrice');
    
    if (storedStep !== null) currentStep = parseInt(storedStep);
    if (storedOptions) selectedOptions = JSON.parse(storedOptions);
    if (storedPrice) priceRangeValue = parseInt(storedPrice);
}

// Save state whenever it changes
function saveState() {
    localStorage.setItem('mortgageFlowStep', currentStep);
    localStorage.setItem('mortgageFlowOptions', JSON.stringify(selectedOptions));
    localStorage.setItem('mortgageFlowPrice', priceRangeValue);
}

// Clear state to start fresh
function clearState() {
    localStorage.removeItem('mortgageFlowStep');
    localStorage.removeItem('mortgageFlowOptions');
    localStorage.removeItem('mortgageFlowPrice');
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadState(); // Load saved data immediately
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlStep = urlParams.get('step');
    const continueStep = document.getElementById('continue-request-step');

    if (urlStep === 'results' || currentStep >= 18) {
        // If they reached the results page, the flow is complete. Do not offer to continue.
        currentStep = 18;
        showStep(18);
        document.getElementById('pre-approval-result').innerHTML = `
            <span class="result-item result-message">Your session has expired or the request is complete. Please submit a new request.</span>
        `;
        clearState(); // Clear temporary state since the application reached the end
    } 
    // If we have a saved step > 0 in local storage, show the "Continue" screen
    else if (currentStep > 0 && continueStep) {
        // Hide all normal steps initially
        containers.forEach(c => c.classList.remove('active'));
        document.querySelector('.progress-steps').style.display = 'none';
        
        // SHOW the continue step
        continueStep.classList.add('active');
        continueStep.style.display = 'flex'; 
    } 
    // Otherwise, start from the beginning
    else {
        showStep(0);
    }
});

// Setup event listeners
function setupEventListeners() {
    // Handle home type cards
    document.querySelectorAll('.home-type-card').forEach(card => {
        card.addEventListener('click', function() {
            if (isTransitioning) return;

            isTransitioning = true;
            document.querySelectorAll('.home-type-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedOptions[currentStep] = card.querySelector('.home-type-label').textContent;
            saveState(); // Save selection
            
            setTimeout(() => {
                currentStep++;
                saveState(); // Save new step index
                showStep(currentStep, 'forward')
                setTimeout(() => isTransitioning = false, 600);
            }, 300);
        });
    });

    // Handle property usage buttons
    document.querySelectorAll('.property-usage-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (isTransitioning) return;

            isTransitioning = true;
            const parentContainer = btn.closest('.mortgage-flow-container');
            parentContainer.querySelectorAll('.property-usage-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedOptions[currentStep] = btn.textContent;
            saveState(); // Save selection
            
            setTimeout(() => {
                currentStep++;
                saveState(); // Save new step index
                showStep(currentStep, 'forward')
                setTimeout(() => isTransitioning = false, 600);
            }, 300);
        });
    });

    // Handle next buttons with validation
    document.querySelectorAll('.next-step-btn:not(#submit-email):not(.final-btn)').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const parentContainer = btn.closest('.mortgage-flow-container');
            
            if (!validateCurrentStep(parentContainer)) {
                return;
            }
            
            // Save input values for non-selection steps
            saveInputValues(parentContainer, currentStep);

            currentStep++;
            saveState(); // Save new step index
            showStep(currentStep, 'forward')
        });
    });

    // Handle back buttons
    document.querySelectorAll('.step-back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (currentStep > 0) {
                currentStep--;
                saveState(); // Save new step index
                showStep(currentStep, 'backward');
                // restoreSelection is now called inside showStep
            }
        });
    });

    // Custom submit handler for email (Step 16)
    document.getElementById('submit-email').addEventListener('click', async (e) => {
        e.preventDefault();
        const parentContainer = e.target.closest('.mortgage-flow-container');
        if (!validateCurrentStep(parentContainer)) return;
        
        saveInputValues(parentContainer, currentStep); // Save email and name
        
        const emailSent = await verifyPreApprovalEmail();
        
        if (emailSent) {
            currentStep++;
            saveState(); // Save new step index (Verification Step 17)
            showStep(currentStep, 'forward');
        }
    });

    // Custom submit handler for final button (Step 17)
    document.querySelector('.final-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        const parentContainer = e.target.closest('.mortgage-flow-container');
        if (!validateCurrentStep(parentContainer)) return;
        
        saveInputValues(parentContainer, currentStep); // Save verification code
        
        const codeVerified = await submitPreApprovalData();
    
        if (codeVerified) {
            currentStep++;
            clearState(); // Application finished, clear temporary state
            showStep(currentStep, 'forward');
        }
    });

    // --- Continue Request Button Logic ---
    document.getElementById('continue-request')?.addEventListener('click', () => {
        const continueStep = document.getElementById('continue-request-step');
        
        // Hide the continue slide
        continueStep.classList.remove('active');
        continueStep.style.display = 'none'; 
        
        // CRITICAL FIX: If user stopped at the verification step (17), take them back to the email step (16)
        if (currentStep >= 17) {
            currentStep = 16;
            saveState();
        }

        // Restore the UI for the current step (or back to email entry)
        showStep(currentStep, 'forward'); 
    });

    // Begin new request link
    document.getElementById('begin-new-request')?.addEventListener('click', () => {
        clearState(); // Clear state to ensure a fresh start
        currentStep = 0;
        window.location.href = window.location.pathname;
    });

    document.querySelector('.restart-request').addEventListener('click', () => {
        clearState(); // Clear state
        window.location.href = window.location.pathname;
    });

    // Price Range Slider
    const priceSlider = document.getElementById('priceSlider');
    
    if (priceSlider) {
        // Initialize the slider with restored value
        priceSlider.value = priceRangeValue;
        updatePriceDisplay(priceRangeValue);
        
        // Update display and save state when slider moves
        priceSlider.addEventListener('input', (e) => {
            priceRangeValue = parseInt(e.target.value);
            updatePriceDisplay(e.target.value);
            // Don't save state here, save on Next button click to reduce I/O
        });
    }

    // Modal functionality
    // ... (Your existing modal logic) ...
}

// --- HELPER FUNCTIONS ---

// Function to save input values (for non-button steps)
function saveInputValues(container, index) {
    const zipInput = container.querySelector('input[placeholder="City or Zip Code"]');
    const firstNameInput = container.querySelector('#firstName');
    const lastNameInput = container.querySelector('#lastName');
    const emailInput = container.querySelector('#emailAddress');
    const verificationInput = container.querySelector('#verificationCode');

    // Save Location (Step 1)
    if (zipInput) {
        selectedOptions[index] = zipInput.value.trim();
    }
    // Save Price Range (Step 9) - Handled globally by priceRangeValue
    if (container.querySelector('#priceSlider')) {
        // Price range is saved in priceRangeValue globally, no need for selectedOptions
    }
    // Save Down Payment (Step 10)
    if (container.querySelector('#downPaymentSlider')) {
        selectedOptions[index] = container.querySelector('#downPaymentSlider').value;
    }
    // Save Name (Step 15)
    if (firstNameInput && lastNameInput) {
        selectedOptions[index] = { 
            firstName: firstNameInput.value.trim(), 
            lastName: lastNameInput.value.trim() 
        };
    }
    // Save Email (Step 16)
    if (emailInput) {
        selectedOptions[index] = emailInput.value.trim();
    }
    // Save Code (Step 17)
    if (verificationInput) {
        selectedOptions[index] = verificationInput.value.trim();
    }
}

// Function to restore input values
function restoreInputValues(container, index) {
    const selectedValue = selectedOptions[index];
    if (!selectedValue) return;

    // Restore Location (Step 1)
    const zipInput = container.querySelector('input[placeholder="City or Zip Code"]');
    if (zipInput && typeof selectedValue === 'string') {
        zipInput.value = selectedValue;
    }

    // Restore Name (Step 15)
    const firstNameInput = container.querySelector('#firstName');
    const lastNameInput = container.querySelector('#lastName');
    if (firstNameInput && lastNameInput && typeof selectedValue === 'object') {
        firstNameInput.value = selectedValue.firstName || '';
        lastNameInput.value = selectedValue.lastName || '';
    }

    // Restore Email (Step 16)
    const emailInput = container.querySelector('#emailAddress');
    if (emailInput && typeof selectedValue === 'string') {
        emailInput.value = selectedValue;
    }

    // Restore Code (Step 17)
    const verificationInput = container.querySelector('#verificationCode');
    if (verificationInput && typeof selectedValue === 'string') {
        verificationInput.value = selectedValue;
    }

    // Restore Price Range (Step 9) - Handled by priceRangeValue globally

    // Restore Down Payment (Step 10)
    const downPaymentSlider = container.querySelector('#downPaymentSlider');
    if (downPaymentSlider && typeof selectedValue === 'string') {
        downPaymentSlider.value = selectedValue;
        initializeDownPaymentSlider(); // Re-run to update display text
    }
}


// Show step
function showStep(index, direction = 'forward') {
    document.querySelector('.preapproval-footer').style.display = 'flex'
    const previousIndex = Array.from(containers).findIndex(c => c.classList.contains('active'));

    // Skip "plan to sell home" step if user doesn't own a home
    if (index === 6 && direction === 'forward') {
        const ownsHome = selectedOptions[5];
        if (ownsHome !== 'Yes, I currently own a home') {
            index = 7;
            currentStep = 7;
        }
    }
    
    // Handle backward navigation - skip if coming back from step 7 and doesn't own home
    if (index === 6 && direction === 'backward') {
        const ownsHome = selectedOptions[5];
        if (ownsHome !== 'Yes, I currently own a home') {
            index = 5;
            currentStep = 5;
        }
    }

    const progressSteps = document.querySelector('.progress-steps');
    if (index === 0 || index >= 18) {
        progressSteps.style.display = 'none';
    } else {
        progressSteps.style.display = 'flex';
    }
    
    // Animation logic remains the same...
    containers.forEach((container, i) => {
        // ... (existing animation logic) ...
        if (i === previousIndex && i !== index) {
            // Add slide out animation to previous step
            if (direction === 'forward') {
                container.classList.add('slide-out-left');
            } else {
                container.classList.add('slide-out-right');
            }
            
            // Remove active class after animation
            setTimeout(() => {
                container.classList.remove('active', 'slide-out-left', 'slide-out-right');
            }, 600);
        } else if (i === index) {
            // Show new step with slide in animation
            if (direction === 'forward') {
                container.classList.add('slide-in-right');
                container.classList.add('active');
            } else {
                container.classList.add('slide-in-left');
                container.classList.add('active');
            }

            // Remove slide-in classes after animation
            setTimeout(() => {
                container.classList.remove('slide-in-right', 'slide-in-left');
            }, 600);
        }
    });

    // Update progress indicators
    updateProgressSteps(index);

    // CRITICAL: Restore selection and input values when showing any step
    restoreSelection(index);
    restoreInputValues(containers[index], index); 

    if (index >= 18) {
        window.history.replaceState(null, '', '?step=results');
    }else if (index > 0) {
        window.history.replaceState(null, '', `?step=${index}`);
    } else {
        window.history.replaceState(null, '', window.location.pathname);
    }

    // Initialize down payment slider if on that step
    const activeContainer = containers[index];
    if (activeContainer && activeContainer.querySelector('#downPaymentSlider')) {
        initializeDownPaymentSlider();
    }
}

// ... (Rest of your original functions like updateProgressSteps, validateCurrentStep,
// updatePriceDisplay, initializeDownPaymentSlider, openModal, closeModal,
// verifyPreApprovalEmail, submitPreApprovalData must remain in the file)