// Pre-Approval Flow Navigation
const APPROVAL_API_BASE = '/public'

let currentStep = 0;
let selectedOptions = [];
let priceRangeValue = 300000;
let isTransitioning = false;
let token;
const containers = document.querySelectorAll('.preapproval-home-type, .mortgage-flow-container');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadState();
    
    const urlParams = new URLSearchParams(window.location.search);
    const savedStep = urlParams.get('step');
    const continueStep = document.getElementById('continue-request-step');
    
    if (savedStep === 'results') {
        currentStep = 18;
        showStep(18);

        const storedResult = localStorage.getItem('preApprovalResult');
        const storedFinalResult = localStorage.getItem('preApprovalFinalResult');
        
        if (storedResult && storedFinalResult) {

            const result = JSON.parse(storedResult);
            const finalResult = JSON.parse(storedFinalResult);
            
            if (result.success) {
                renderApprovedResult(result, finalResult);
            } else {
                renderDeclinedResult(result, finalResult);
            }
        } else {

            document.getElementById('pre-approval-result').innerHTML = `
                <span class="result-item result-message">Your session has expired. Please submit a new request.</span>
            `;
        }

        clearState();
    } else if (currentStep > 0 && continueStep) {
        containers.forEach(c => c.classList.remove('active'));
        document.querySelector('.preapproval-footer').style.display = 'flex'

        console.log(currentStep)
        continueStep.classList.add('active');
    } else {
        showStep(0);
    }
});

// Load state from localStorage on initialization
function loadState() {
    const storedStep = localStorage.getItem('mortgageFlowStep');
    const storedOptions = localStorage.getItem('mortgageFlowOptions');
    // const storedPrice = localStorage.getItem('mortgageFlowPrice');
    
    if (storedStep !== null) currentStep = parseInt(storedStep);
    if (storedOptions) selectedOptions = JSON.parse(storedOptions);
    // if (storedPrice) priceRangeValue = parseInt(storedPrice);
}

// Save state whenever it changes
function saveState() {
    localStorage.setItem('mortgageFlowStep', currentStep);
    localStorage.setItem('mortgageFlowOptions', JSON.stringify(selectedOptions));
    // localStorage.setItem('mortgageFlowPrice', priceRangeValue);
}

// Clear state to start fresh
function clearState() {
    localStorage.removeItem('mortgageFlowStep');
    localStorage.removeItem('mortgageFlowOptions');
    // localStorage.removeItem('mortgageFlowPrice');
}

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
            saveState();

            setTimeout(() => {
                currentStep++;
                saveState();
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
            saveState();

            setTimeout(() => {
                currentStep++;
                saveState();
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

            const formParent = btn.closest('.step-form');
            if(formParent){
                const stepInputs = formParent.querySelectorAll('.step-input');
                
                if (!selectedOptions[currentStep]) {
                    selectedOptions[currentStep] = {};
                }
                
                stepInputs.forEach(input => {
                    // Use input id, name, or placeholder as key
                    const key = input.id || input.name || input.placeholder;
                    selectedOptions[currentStep][key] = input.value;
                });
                
                console.log(selectedOptions[currentStep]);
            }

            // 🔥 ADD THIS: Save slider values for slider steps
            const priceSlider = parentContainer.querySelector('#priceSlider');
            if (priceSlider) {
                selectedOptions[currentStep] = {
                    priceRange: priceSlider.value
                };
            }

            const downPaymentSlider = parentContainer.querySelector('#downPaymentSlider');
            if (downPaymentSlider) {
                selectedOptions[currentStep] = {
                    downPayment: downPaymentSlider.value
                };
            }

            currentStep++;
            saveState();
            showStep(currentStep, 'forward')
        });
    });

    // Handle back buttons
    document.querySelectorAll('.step-back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (currentStep > 0) {
                currentStep--;
                saveState();
                showStep(currentStep, 'backward');
                // Restore selected options
                restoreSelection(currentStep);
            }
        });
    });

    document.getElementById('submit-email').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const parentContainer = e.target.closest('.mortgage-flow-container');
        
        if (!validateCurrentStep(parentContainer)) {
            return;
        }

        // saveInputValues(parentContainer, currentStep);
        
        const emailSent = await verifyPreApprovalEmail();
        
        if (emailSent) {
            currentStep++;
            saveState();
            showStep(currentStep, 'forward');
        }
    });

    document.querySelector('.final-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const parentContainer = e.target.closest('.mortgage-flow-container');
        
        if (!validateCurrentStep(parentContainer)) {
            return;
        }
        
        const codeVerified = await submitPreApprovalData();
    
        if (codeVerified) {
            currentStep++;
            clearState();
            showStep(currentStep, 'forward');
        }
    });

    // Continue request button
    document.getElementById('continue-request')?.addEventListener('click', () => {
        const continueStep = document.getElementById('continue-request-step');
        continueStep.classList.remove('active');

        if (currentStep >= 17) {
            currentStep = 16;
            saveState();
        }
        
        console.log(currentStep)
        showStep(currentStep, 'forward');
    });

    // Begin new request link
    document.getElementById('begin-new-request')?.addEventListener('click', () => {
        clearState();
        currentStep = 0;
        window.location.href = window.location.pathname;
    });

    document.querySelector('.restart-request').addEventListener('click', () => {
        clearState();
        currentStep = 0;
        window.location.href = window.location.pathname;
    });

    // Price Range Slider
    const priceSlider = document.getElementById('priceSlider');
    const priceRangeText = document.getElementById('priceRangeText');

    if (priceSlider && priceRangeText) {
        // Initialize the slider
        updatePriceDisplay(priceSlider.value);

        // Update display when slider moves
        priceSlider.addEventListener('input', (e) => {
            priceRangeValue = parseInt(e.target.value);
            updatePriceDisplay(e.target.value);
        });
    }

    // Modal functionality
    const modalOverlay = document.getElementById('downPaymentModal');
    const modalClose = document.getElementById('modalClose');
    const modalGotIt = document.getElementById('modalGotIt');
    const stepLink = document.querySelector('.step-link');

    if (stepLink) {
        stepLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modalGotIt) {
        modalGotIt.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
}

// Show step
function showStep(index, direction = 'forward') {
    document.querySelector('.preapproval-footer').style.display = 'flex'
    const previousIndex = Array.from(containers).findIndex(c => c.classList.contains('active'));

    // Skip "plan to sell home" step if user doesn't own a home
    if (index === 6 && direction === 'forward') {
        // Check if user selected "Yes, I currently own a home" in step 5
        const ownsHome = selectedOptions[5];
        if (ownsHome !== 'Yes, I currently own a home') {
            index = 7; // Skip to next step
            currentStep = 7;
        }
    }
    
    // Handle backward navigation - skip if coming back from step 7 and doesn't own home
    if (index === 6 && direction === 'backward') {
        const ownsHome = selectedOptions[5];
        if (ownsHome !== 'Yes, I currently own a home') {
            index = 5; // Go back to "own home" step instead
            currentStep = 5;
        }
    }

    const progressSteps = document.querySelector('.progress-steps');
    if (index === 0 || index === 18) {
        progressSteps.style.display = 'none';
    } else {
        progressSteps.style.display = 'flex';
    }

    containers.forEach((container, i) => {
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

    // restoreSelection(index);
    // restoreInputValues(containers[index], index);

    if (index === 18) {
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

function updateProgressSteps(stepIndex) {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');
    
    // Define step ranges for each progress section
    const ranges = [
        { start: 1, end: 2, progressIndex: 0 },   // Property: steps 1-2
        { start: 3, end: 8, progressIndex: 1 },   // Timeline: steps 3-7
        { start: 9, end: 14, progressIndex: 2 },  // Details: steps 8-13
        { start: 15, end: 17, progressIndex: 3 }  // Wrap-up: steps 14-16
    ];
    
    let currentRange = ranges.find(r => stepIndex >= r.start && stepIndex <= r.end);
    let progressIndex = currentRange ? currentRange.progressIndex : -1;
    
    // Calculate progress percentage within current section
    let progressPercent = 0;
    if (currentRange) {
        const stepsInRange = currentRange.end - currentRange.start + 1;
        const currentStepInRange = stepIndex - currentRange.start + 1;
        progressPercent = (currentStepInRange / stepsInRange) * 100;
    }
    
    // Circle circumference calculation (radius = 15px, circumference = 2 * π * r)
    const circumference = 2 * Math.PI * 15;
    
    progressSteps.forEach((step, i) => {
        const circle = step.querySelector('.progress-circle');
        const check = step.querySelector('.progress-check');
        const progressRing = circle.querySelector('.progress-ring');
        
        if (i < progressIndex) {
            // Completed sections
            step.classList.add('completed');
            step.classList.remove('active');
            progressRing.style.strokeDashoffset = 0;
            check.style.display = 'block';
        } else if (i === progressIndex) {
            // Current active section
            step.classList.add('active');
            step.classList.remove('completed');
            const offset = circumference - (circumference * progressPercent / 100);
            progressRing.style.strokeDashoffset = offset;
            
            // Show check only when 100% complete
            check.style.display = progressPercent === 100 ? 'block' : 'none';
        } else {
            // Future sections
            step.classList.remove('active', 'completed');
            progressRing.style.strokeDashoffset = circumference;
            check.style.display = 'none';
        }
    });
    
    progressLines.forEach((line, i) => {
        if (i < progressIndex) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
}

// Input validation function
function validateCurrentStep(container) {
    // Validate zip code input
    const zipInput = container.querySelector('input[placeholder="City or Zip Code"]');
    if (zipInput) {
        const value = zipInput.value.trim();
        if (value === '') {
            showToast('Please enter a city or zip code', 'error');
            zipInput.focus();
            return false;
        }
        // Basic validation - at least 3 characters
        if (value.length < 3) {
            showToast('Please enter a valid city or zip code', 'error');
            zipInput.focus();
            return false;
        }
    }

    // Validate name inputs
    const firstNameInput = container.querySelector('#firstName');
    const lastNameInput = container.querySelector('#lastName');
    if (firstNameInput && lastNameInput) {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        
        if (firstName === '') {
            showToast('Please enter your first name', 'error');
            firstNameInput.focus();
            return false;
        }
        if (lastName === '') {
            showToast('Please enter your last name', 'error');
            lastNameInput.focus();
            return false;
        }
        // Name should only contain letters, spaces, hyphens, and apostrophes
        const namePattern = /^[a-zA-Z\s'-]+$/;
        if (!namePattern.test(firstName)) {
            showToast('First name can only contain letters', 'error');
            firstNameInput.focus();
            return false;
        }
        if (!namePattern.test(lastName)) {
            showToast('Last name can only contain letters', 'error');
            lastNameInput.focus();
            return false;
        }
    }

    // Validate email input
    const emailInput = container.querySelector('#emailAddress');
    if (emailInput) {
        const email = emailInput.value.trim();
        if (email === '') {
            showToast('Please enter your email address', 'error');
            emailInput.focus();
            return false;
        }
        // Email validation regex
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showToast('Please enter a valid email address', 'error');
            emailInput.focus();
            return false;
        }
    }

    // Validate verification code
    const verificationInput = container.querySelector('#verificationCode');
    if (verificationInput) {
        const code = verificationInput.value.trim();
        if (code === '') {
            showToast('Please enter the verification code', 'error');
            verificationInput.focus();
            return false;
        }
        // Verification code should be at least 4 characters
        if (code.length < 4) {
            showToast('Please enter a valid verification code', 'error');
            verificationInput.focus();
            return false;
        }
    }

    return true;
}

// Restore selection
function restoreSelection(index) {
    const container = containers[index];
    const selectedValue = selectedOptions[index];
    
    if (!selectedValue) return;

    // Restore home type selection
    const homeCards = container.querySelectorAll('.home-type-card');
    homeCards.forEach(card => {
        if (card.querySelector('.home-type-label').textContent === selectedValue) {
            card.classList.add('selected');
        }
    });

    // Restore button selection
    const btns = container.querySelectorAll('.property-usage-btn');
    btns.forEach(btn => {
        if (btn.textContent.trim() === selectedValue) {
            btn.classList.add('selected');
        }
    });

    // Restore input values
    const inputs = container.querySelectorAll('.step-input');
    inputs.forEach(input => {
        // Check if selectedValue is an object (multiple inputs)
        if (typeof selectedValue === 'object' && !Array.isArray(selectedValue)) {
            // Get the key for this input (same logic as when saving)
            const key = input.id || input.name || input.placeholder;
            
            // If this input's value was saved, restore it
            if (selectedValue[key] !== undefined) {
                input.value = selectedValue[key];
            }
        } else {
            // If selectedValue is a string (single input or button selection)
            input.value = selectedValue;
        }
    });

    // 🔥 ADD THIS: Restore sliders
    if (typeof selectedValue === 'object' && !Array.isArray(selectedValue)) {
        // Restore price range slider
        if (selectedValue.priceRange) {
            const priceSlider = container.querySelector('#priceSlider');
            if (priceSlider) {
                priceSlider.value = selectedValue.priceRange;
                priceRangeValue = parseInt(selectedValue.priceRange);
                updatePriceDisplay(selectedValue.priceRange);
            }
        }

        // Restore down payment slider
        if (selectedValue.downPayment) {
            const downPaymentSlider = container.querySelector('#downPaymentSlider');
            if (downPaymentSlider) {
                downPaymentSlider.value = selectedValue.downPayment;
                updateDownPaymentDisplay(selectedValue.downPayment);
            }
        }
    }
}

// Update price display
function updatePriceDisplay(value) {
    const priceRangeText = document.getElementById('priceRangeText');
    const minPrice = parseInt(value);
    const maxPrice = minPrice + 50000;
    
    const formattedMin = formatCurrency(minPrice);
    const formattedMax = formatCurrency(maxPrice);
    
    priceRangeText.textContent = `${formattedMin} - ${formattedMax}`;
    
    const priceSlider = document.getElementById('priceSlider');
    updateSliderTrack(priceSlider);
}

// Down Payment Slider Implementation
function initializeDownPaymentSlider() {
    const downPaymentSlider = document.getElementById('downPaymentSlider');
    const downPaymentText = document.getElementById('downPaymentRangeText');
    
    if (downPaymentSlider && downPaymentText) {
        // Set initial percentage to 20%
        downPaymentSlider.value = 20;
        updateDownPaymentDisplay(20);
        
        // Update display when slider moves
        downPaymentSlider.addEventListener('input', (e) => {
            updateDownPaymentDisplay(e.target.value);
        });
    }
}

// Update down payment display
function updateDownPaymentDisplay(percentage) {
    const downPaymentSlider = document.getElementById('downPaymentSlider');
    const downPaymentText = document.getElementById('downPaymentRangeText');
    
    if (!downPaymentSlider || !downPaymentText) return;

    const percent = parseInt(percentage);
    const maxPrice = priceRangeValue + 50000;
    const downPaymentAmount = Math.round((maxPrice * percent) / 100);
    const formattedAmount = formatCurrency(downPaymentAmount);
    
    downPaymentText.textContent = `${formattedAmount} (${percent}% Down)`;
    
    updateSliderTrack(downPaymentSlider);
}

// Update slider track
function updateSliderTrack(slider) {
    const min = slider.min;
    const max = slider.max;
    const value = slider.value;
    
    const percentage = ((value - min) / (max - min)) * 100;
    
    slider.style.background = `linear-gradient(to right, #1a1a1a 0%, #1a1a1a ${percentage}%, #d0d0d0 ${percentage}%, #d0d0d0 100%)`;
}

// Open modal
function openModal() {
    const modalOverlay = document.getElementById('downPaymentModal');
    modalOverlay.style.display = 'flex';
    modalOverlay.offsetHeight;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modalOverlay = document.getElementById('downPaymentModal');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'scroll';

    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 300);
}

async function verifyPreApprovalEmail() {
    const emailInput = document.getElementById('emailAddress');
    const nameInput = document.getElementById('firstName');
    const email = emailInput?.value.trim();
    const name = nameInput?.value.trim();
    
    // Find the button in the email step (not final-btn)
    const emailContainer = emailInput?.closest('.mortgage-flow-container');
    const submitBtn = emailContainer?.querySelector('.next-step-btn');
    
    if (!submitBtn) return false;
    
    try {
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;
        
        const response = await fetch(`${APPROVAL_API_BASE}/pre-approval-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify({ email: email, name: name })
        });
        
        const result = await response.json();
        
        submitBtn.innerHTML = originalText;

        if (response.ok) {
            submitBtn.disabled = true;
            token = result.token
            // codeExpires = result.codeExpires
            // collectFormData(codeExpires)
            
            return true;
        } else {
            showToast('Failed to send verification code.', 'error');
            submitBtn.disabled = false;
            return false;
        }
    } catch (error) {
        console.error('Email verification error:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return false;
    }
}

// Function to collect all form data
function collectFormData() {
    return {
        homeType: selectedOptions[0] || '',
        location: document.querySelector('input[placeholder="City or Zip Code"]')?.value.trim() || '',
        propertyUsage: selectedOptions[2] || '',
        buyingTimeline: selectedOptions[3] || '',
        workingWithAgent: selectedOptions[4] || '',
        currentlyOwnHome: selectedOptions[5] || '',
        planningToSellHome: selectedOptions[6] || '',
        firstTimeBuyer: selectedOptions[7] || '',
        militaryService: selectedOptions[8] || '',
        priceRangeMin: priceRangeValue,
        priceRangeMax: priceRangeValue + 50000,
        downPaymentPercentage: parseInt(document.getElementById('downPaymentSlider')?.value || 20),
        downPaymentAmount: Math.round(((priceRangeValue + 50000) * parseInt(document.getElementById('downPaymentSlider')?.value || 20)) / 100),
        employmentStatus: selectedOptions[11] || '',
        annualIncome: selectedOptions[12] || '',
        creditScore: selectedOptions[13] || '',
        bankruptcyForeclosure: selectedOptions[14] || '',
        firstName: document.getElementById('firstName')?.value.trim() || '',
        lastName: document.getElementById('lastName')?.value.trim() || '',
        email: document.getElementById('emailAddress')?.value.trim() || '',
        code: document.getElementById('verificationCode')?.value.trim() || '',
        token: token
    };
}

// Function to submit data to backend
async function submitPreApprovalData() {
    const formData = collectFormData();
    
    try {
        const submitBtn = document.querySelector('.final-btn');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;
        
        const response = await fetch(`${APPROVAL_API_BASE}/pre-approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': window.getCsrfToken()
            },
            credentials: "include",
            body: JSON.stringify(formData)
        });

        const result = await response.json()

        const finalResult = result.result
        
        if (response.ok) {

            localStorage.setItem('preApprovalResult', JSON.stringify(result));
            localStorage.setItem('preApprovalFinalResult', JSON.stringify(finalResult));
            
            if (result.success) {
                renderApprovedResult(result, finalResult);
            } else {
                renderDeclinedResult(result, finalResult);
            }

            return true
        } else {
            showToast(result.invalidCode ? 'Invalid verification code' : 'Submission failed. Please try again.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return false
        }
    } catch (error) {
        console.error('Submission error:', error);
        showToast('Network error. Please check your connection and try again.', 'error');

        const submitBtn = document.querySelector('.final-btn');
        submitBtn.textContent = 'Show My Result';
        submitBtn.disabled = false;
        return false
    }
}

function renderApprovedResult(result, finalResult){
    document.getElementById('step-title').innerHTML = `<span class="result-item result-message">${escapeHtml(result.message)}</span>`

    document.getElementById('pre-approval-result').innerHTML = `
        <span class="result-item result-status">
            <b>Pre-approval status</b><br>
            <span class="status-value">${escapeHtml(finalResult.status)}</span>
        </span>
        <span class="result-item result-max-purchase-price"><b>Maximum purchase price</b><br>$${escapeHtml(finalResult.maxPurchasePrice.toLocaleString())}</span>
        <span class="result-item result-loan-amount"><b>Loan amount</b><br>$${escapeHtml(finalResult.loanAmount.toLocaleString())}</span>
        <span class="result-item result-interest-rate"><b>Interest rate</b><br>${escapeHtml(finalResult.interestRate)}</span>
    `
}

function renderDeclinedResult(result, finalResult){
    document.getElementById('step-title').innerHTML = `<span class="result-item result-message">${escapeHtml(result.message)}</span>`

    document.getElementById('pre-approval-result').innerHTML = `
        <span class="result-item result-status">
            <b>Pre-approval status</b><br>
            <span class="status-value">${escapeHtml(finalResult.status)}</span>
        </span>

        <span class="result-item result-max-purchase-price"><b>Maximum purchase price</b><br>-</span>
        <span class="result-item result-loan-amount"><b>Loan amount</b><br>-</span>
        <span class="result-item result-interest-rate"><b>Interest rate</b><br>-</span>
    `
}

// Helper functions
function formatCurrency(value) {
    return '$' + value.toLocaleString('en-US');
}