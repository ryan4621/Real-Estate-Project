// confirmation-modal.js

let confirmationModal = null;
let confirmResolve = null;

// Add CSS styles
const styles = `
  .confirm-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
    padding-top: clamp(5rem, 10vh, 7rem);
  }

  .confirm-modal-overlay.show {
    opacity: 1;
  }

  .confirm-modal {
    background: white;
    border-radius: clamp(0.625rem, 1.5vw, 0.875rem);
    box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.2);
    max-width: min(30rem, 90vw);
    width: max(20rem, 90%);
    transform: translateY(-6.25rem);
    transition: transform 0.3s ease;
  }

  .confirm-modal-overlay.show .confirm-modal {
    transform: translateY(0);
  }

  .confirm-modal-header {
    padding: clamp(1.25rem, 3vh, 1.75rem) clamp(1.25rem, 3vw, 1.75rem) clamp(0.75rem, 2vh, 1.25rem) clamp(1.25rem, 3vw, 1.75rem);
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .confirm-modal-title {
    font-size: clamp(1.1rem, 2vw, 1.25rem);
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
    line-height: 1.4;
  }

  .confirm-modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    font-weight: 200;
    cursor: pointer;
    color: #1a1a1a;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: background 0.2s;
    line-height: 1;
    margin-top: clamp(-0.375rem, -0.5vh, -0.125rem);
  }

  .confirm-modal-close:hover {
    color: rgb(149, 149, 149);
  }

  .confirm-modal-body {
    padding: 0 clamp(1.25rem, 3vw, 1.75rem) clamp(1.25rem, 3vh, 1.75rem) clamp(1.25rem, 3vw, 1.75rem);
    font-size: clamp(0.875rem, 2vw, 1rem);
    color: #4a4a4a;
    line-height: 1.6;
  }

  .confirm-modal-footer {
    padding: 0 clamp(1.25rem, 3vw, 1.75rem) clamp(1.25rem, 3vh, 1.75rem) clamp(1.25rem, 3vw, 1.75rem);
    border-top: none;
    display: flex;
    justify-content: flex-start;
    gap: clamp(0.375rem, 1vw, 0.5rem);
  }

  .confirm-btn {
    padding: clamp(0.5rem, 1.25vh, 0.75rem) clamp(1.375rem, 3vw, 1.875rem);
    border: none;
    border-radius: 1.5rem;
    font-size: clamp(0.875rem, 2vw, 1rem);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .confirm-btn-cancel {
    background: transparent;
    color: #1a1a1a;
    text-decoration: underline;
    padding: clamp(0.625rem, 1.5vh, 0.875rem) clamp(0.875rem, 2vw, 1.125rem);
  }

  .confirm-btn-cancel:hover {
    color:rgb(117, 117, 117);
  }

  .confirm-btn-confirm {
    background: #1a1a1a;
    color: white;
  }

  .confirm-btn-confirm:hover {
    background:rgb(142, 142, 142);
  }

  .confirm-btn-danger {
    background:rgb(169, 39, 39);
    color: white;
  }

  .confirm-btn-danger:hover {
    background: rgb(224, 106, 106);
  }

  .confirm-btn-primary {
    background: #007bff;
    color: white;
  }

  .confirm-btn-primary:hover {
    background: #0056b3;
  }
`;

// Inject styles
if (!document.getElementById('confirm-modal-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'confirm-modal-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

function createConfirmationModal() {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-modal-overlay';
  overlay.id = 'confirmationModalOverlay';

  overlay.innerHTML = `
    <div class="confirm-modal" id="confirmationModalContent">
      <div class="confirm-modal-header">
        <h5 class="confirm-modal-title" id="confirmModalTitle">Confirm Action</h5>
        <button class="confirm-modal-close" id="confirmModalClose">×</button>
      </div>
      <div class="confirm-modal-body" id="confirmModalBody">
        Are you sure you want to proceed?
      </div>
      <div class="confirm-modal-footer">
        <button class="confirm-btn confirm-btn-confirm" id="confirmOkBtn">Confirm</button>
        <button class="confirm-btn confirm-btn-cancel" id="confirmCancelBtn">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Prevent clicks on modal content from closing
  document.getElementById('confirmationModalContent').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close on overlay click
  overlay.addEventListener('click', () => {
    hideModal();
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }
  });

  // Close button
  document.getElementById('confirmModalClose').addEventListener('click', () => {
    hideModal();
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }
  });

  // Cancel button
  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    console.log('Cancel clicked'); // Debug
    hideModal();
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }
  });

  // OK button
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    console.log('OK clicked'); // Debug
    hideModal();
    if (confirmResolve) {
      confirmResolve(true);
      confirmResolve = null;
    }
  });

  confirmationModal = overlay;
}

function showModal() {
  if (!confirmationModal) {
    createConfirmationModal();
  }
  
  confirmationModal.style.display = 'flex';
  // Trigger reflow
  confirmationModal.offsetHeight;
  confirmationModal.classList.add('show');
  document.body.style.overflow = 'hidden'
}

function hideModal() {
  if (confirmationModal) {
    confirmationModal.classList.remove('show');
    setTimeout(() => {
      confirmationModal.style.display = 'none';
      document.body.style.overflow = ''
    }, 300);
  }
}

/**
 * Show confirmation modal
 * @param {string} message - The message to display
 * @param {string} title - Optional title (default: "Confirm Action")
 * @param {object} options - Optional customization
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
async function showConfirmation(message, title = 'Confirm Action', options = {}) {
  if (!confirmationModal) {
    createConfirmationModal();
  }

  const {
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    variant = 'dark'
  } = options;

  // Set content
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalBody').innerHTML = message;
  
  const confirmBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  
  // Remove all variant classes
  confirmBtn.className = 'confirm-btn';
  
  // Add appropriate class
  if (danger) {
    confirmBtn.classList.add('confirm-btn-danger');
  } else if (variant === 'primary') {
    confirmBtn.classList.add('confirm-btn-primary');
  } else {
    confirmBtn.classList.add('confirm-btn-confirm');
  }

  showModal();

  // Return promise
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

// Make it globally accessible
window.showConfirmation = showConfirmation;