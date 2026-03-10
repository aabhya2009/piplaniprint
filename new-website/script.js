const reveals = document.querySelectorAll('.reveal');

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

reveals.forEach((el, i) => {
  el.style.transitionDelay = `${i * 90}ms`;
  io.observe(el);
});
