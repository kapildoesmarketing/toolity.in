/* Designed by Kapil Pidhwani: Pure Vanilla JS ambient motion effects */

document.addEventListener('DOMContentLoaded', () => {
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
