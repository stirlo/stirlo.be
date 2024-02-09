document.addEventListener('mousemove', (e) => {
    const card = document.getElementById('card');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const rotateY = mouseX * 0.1;
    const rotateX = -mouseY * 0.1;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

// Add click event listener to document
document.addEventListener('click', () => {
    window.location.href = 'https://tfp.la/stirling/';
});

// Add keydown event listener to document
document.addEventListener('keydown', () => {
    window.location.href = 'https://tfp.la/stirling/';
});
