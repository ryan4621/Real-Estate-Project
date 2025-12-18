// toast.js

// Inject toast styles once when script loads
(function injectToastStyles() {
  if (document.getElementById('toast-styles')) return; // Already injected
  
  const link = document.createElement('link');
  link.id = 'toast-styles';
  link.rel = 'stylesheet';
  link.href = '/frontend/general/toast-helper.css';
  document.head.appendChild(link);
})();

function showToast(message, type = 'info', duration = 2000) {
  console.log('showToast called:', message, type);
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Strong inline styles
  toast.style.setProperty('display', 'block', 'important');

  // Background by type
  switch(type) {
    case 'success':
      toast.style.backgroundColor = '#28a745';
      break;
    case 'error':
      toast.style.backgroundColor = '#dc3545';
      break;
    case 'warning':
      toast.style.backgroundColor = '#9e8025ff';
    //   toast.style.color = '#000';
      break;
    default: // 'info'
      toast.style.backgroundColor = '#007bff';
  }

  toast.textContent = message;
  
  // Append to body
  (document.body || document.documentElement).appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 100);

  // Auto remove after duration
  const remove = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(10px)';
    setTimeout(() => { 
      if (toast.parentNode) toast.parentNode.removeChild(toast); 
    }, 260);
  };
  
  setTimeout(remove, duration);

  return toast;
}
  
function redirectWithToast(message, type, targetUrl, delay = 2000) {
  showToast(message, type);
  setTimeout(() => {
    window.location.href = targetUrl;
  }, delay);
}

function reloadWithToast(message, type, delay = 2000) {
  showToast(message, type);
  setTimeout(() => {
    window.location.reload();
  }, delay);
}

function replaceWithToast(message, type, targetUrl, delay = 2000) {
  showToast(message, type);
  setTimeout(() => {
    window.location.replace(targetUrl)
  }, delay);
}

// Make it globally available
window.showToast = showToast;
window.redirectWithToast = redirectWithToast;
window.reloadWithToast = reloadWithToast;
window.replaceWithToast = replaceWithToast;