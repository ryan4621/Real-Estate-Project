// //find-agent.js

// const AGENT_API_BASE = '/public'

// document.addEventListener('DOMContentLoaded', async () => {
// 	setUpAgentEventListeners();
// });

// function setUpAgentEventListeners() {
// 	const searchWrapper = document.querySelector('.hero-search-wrapper');
// 	const heroSection = document.querySelector('.hero-section');

// 	window.addEventListener('scroll', () => {
// 		const heroBottom = heroSection.getBoundingClientRect().bottom;
		
// 		if (heroBottom <= 80) {
// 			searchWrapper.classList.add('sticky');
// 		} else {
// 			searchWrapper.classList.remove('sticky');
// 		}
// 	});

// 	const heroSearchInput = document.querySelector('.hero-search-input');
// 	const defaultValue = 'Los Angeles, CA';

// 	document.querySelector('.hero-clear-btn').addEventListener('click', () => {
// 		heroSearchInput.value = '';
// 		heroSearchInput.focus();
// 	});

// 	heroSearchInput.addEventListener('blur', () => {
// 		if (heroSearchInput.value.trim() === '') {
// 			heroSearchInput.value = defaultValue;
// 		}
// 	});

// 	const heroSearchBtn = document.querySelector('.hero-search-btn');

// 	heroSearchBtn.addEventListener('click', () => {
// 		const searchValue = heroSearchInput.value.trim();
		
// 		if (searchValue) {
// 			window.location.href = `/frontend/guest/agents.html?search=${encodeURIComponent(searchValue)}`;
// 		} else {
// 			window.location.href = `/frontend/guest/agents.html`;
// 		}
// 	});

// 	heroSearchInput.addEventListener('keypress', (e) => {
// 		if (e.key === 'Enter') {
// 			heroSearchBtn.click();
// 		}
// 	});

//     document.querySelectorAll('.sold-faq-question').forEach(header => {
//         header.addEventListener('click', () => {
//             const content = header.nextElementSibling;
            
//             header.classList.toggle('collapsed');
//             if(content && content.classList.contains('sold-faq-answer')){
//                 content.classList.toggle('collapsed');
//             }
//         });
//     });
// }

// find-agent.js

document.addEventListener('DOMContentLoaded', () => {
    setupModalListeners();
    setupFAQListeners();
    setupFormSubmission();
});

// Setup modal listeners
function setupModalListeners() {
    const modal = document.getElementById('agent-page-form-modal');
    const overlay = document.getElementById('agent-page-form-overlay');
    const closeBtn = document.getElementById('agent-page-form-close-btn');
    const cancelBtn = document.getElementById('agent-page-form-cancel-btn');
    
    // All CTA buttons that open the modal
    const ctaButtons = [
        document.getElementById('agent-section-one-cta'),
        document.getElementById('frequently-asked-questions-cta'),
        document.getElementById('agent-section-two-cta')
    ];

    // Open modal when any CTA button is clicked
    ctaButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', openModal);
        }
    });

    // Close modal handlers
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // Prevent closing when clicking inside modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Open modal function
function openModal() {
    const modal = document.getElementById('agent-page-form-modal');
    const overlay = document.getElementById('agent-page-form-overlay');
    
    if (modal && overlay) {
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal function
function closeModal() {
    const modal = document.getElementById('agent-page-form-modal');
    const overlay = document.getElementById('agent-page-form-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        const form = document.getElementById('agent-page-form');
        if (form) {
            form.reset();
        }
    }
}

// Setup FAQ accordion listeners
function setupFAQListeners() {
    const faqTriggers = document.querySelectorAll('.frequently-asked-question-trigger');
    
    faqTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.closest('.frequently-asked-question-item');
            const wasActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.frequently-asked-question-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Toggle current item
            if (!wasActive) {
                item.classList.add('active');
            }
        });
    });
}

// Setup form submission
function setupFormSubmission() {
    const form = document.getElementById('agent-page-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                option: document.getElementById('agent-page-form-option').value,
                zip: document.getElementById('agent-page-form-zip').value,
                name: document.getElementById('agent-page-form-name').value,
                email: document.getElementById('agent-page-form-email').value,
                phone: document.getElementById('agent-page-form-phone').value
            };
            
            // Basic validation
            if (!formData.option || !formData.zip || !formData.name || !formData.email || !formData.phone) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Submit form
            try {
                // Here you would make your API call
                console.log('Form data:', formData);
                
                // Show success message
                alert('Thank you! An agent will contact you shortly.');
                
                // Close modal
                closeModal();
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('There was an error submitting your request. Please try again.');
            }
        });
    }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});