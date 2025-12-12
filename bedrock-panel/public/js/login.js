const form = document.getElementById('login-form');
const usernameInput = document.getElementById('login-username');
const passwordInput = document.getElementById('login-password');
const feedbackEl = document.getElementById('login-feedback');

function setFeedback(message, isError = false) {
  if (!feedbackEl) return;
  feedbackEl.textContent = message || '';
  feedbackEl.classList.toggle('text-emerald-400', !isError);
  feedbackEl.classList.toggle('text-rose-400', isError);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value || '';
  if (!username || !password) {
    setFeedback('Username and password are required.', true);
    return;
  }
  setFeedback('Signing in...', false);
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    setFeedback('Login successful. Redirecting...');
    window.location.href = '/dashboard';
  } catch (error) {
    setFeedback(error.message, true);
  }
});
