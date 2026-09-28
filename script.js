/* Designed by Kapil Pidhwani: Pure Vanilla JS micro-interactions & offline-resilient early access registration */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('early-access-form');
  const emailInput = document.getElementById('email-input');
  const submitBtn = document.getElementById('submit-btn');
  const toast = document.getElementById('toast');
  let toastTimeout = null;

  // Check if user has already registered locally
  const savedEmail = localStorage.getItem('toolity_user_email');
  if (savedEmail) {
    emailInput.value = savedEmail;
    submitBtn.innerHTML = `
      <span class="btn-text">Subscribed</span>
      <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  }

  // Toast Display Helper
  function showToast(title, message) {
    if (!toast) return;
    
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    const titleEl = toast.querySelector('.toast-title');
    const msgEl = toast.querySelector('.toast-msg');
    
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    toast.classList.add('show');

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // Form Submission Logic
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        emailInput.focus();
        showToast('Invalid Email', 'Please enter a valid email address to join the waitlist.');
        return;
      }

      // Store in localStorage for zero-backend initial resilience
      try {
        const subscribers = JSON.parse(localStorage.getItem('toolity_subscribers') || '[]');
        if (!subscribers.includes(email)) {
          subscribers.push(email);
          localStorage.setItem('toolity_subscribers', JSON.stringify(subscribers));
        }
        localStorage.setItem('toolity_user_email', email);
      } catch (err) {
        console.warn('LocalStorage unavailable:', err);
      }

      // UI Feedback State
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="btn-text">You're On The List!</span>
        <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      showToast('Welcome Aboard! 🎉', 'You have been added to early access. We will notify you at launch!');
    });
  }

  // Interactive subtle parallax effect on background orbs based on mouse movement
  const orbs = document.querySelectorAll('.orb');
  if (window.matchMedia('(pointer: fine)').matches && orbs.length > 0) {
    window.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth) - 0.5;
      const yPercent = (clientY / window.innerHeight) - 0.5;

      orbs.forEach((orb, index) => {
        const depth = (index + 1) * 15;
        const xOffset = xPercent * depth;
        const yOffset = yPercent * depth;
        orb.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      });
    }, { passive: true });
  }
});
