const card = document.getElementById('card');
let xSpeed, ySpeed;
let zRotation = 0; // Current Z-axis rotation
let zRotationRate = 0; // Rotation rate for Z-axis
let damping = 0.95; // Damping factor to reduce speed after bounce
let minSpeed = 2; // Minimum speed to ensure it moves away from the edge
let dragging = false;
let originalWidth = card.offsetWidth; // Assuming originalWidth is defined

// Initialize card position and speed
function initCard() {
  // Center the card
  card.style.left = (window.innerWidth / 2 - card.offsetWidth / 2) + 'px';
  card.style.top = (window.innerHeight / 2 - card.offsetHeight / 2) + 'px';

  // Reset Z-axis rotation
  zRotation = 0;
  card.style.transform = `rotate3d(1, 1, 1, ${zRotation}deg)`;

  // Set initial speed based on a random direction
  const directions = [300, 60, 120, 210];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  const speed = 2; // Initial speed
  xSpeed = speed * Math.cos(direction * Math.PI / 180);
  ySpeed = speed * Math.sin(direction * Math.PI / 180);

  // Set an initial Z-axis rotation rate
  zRotationRate = getRandomRotationRate();
}

function moveCard() {
  if (!dragging) {
    let rect = card.getBoundingClientRect();
    let containerRect = document.getElementById('container').getBoundingClientRect();

    // Update Z-axis rotation
    zRotation += zRotationRate;

    // Check for collision with container edges
    if (rect.right >= containerRect.right || rect.left <= containerRect.left) {
      xSpeed *= -1 * damping;
      xSpeed = adjustSpeed(xSpeed);
      zRotationRate = getRandomRotationRate(); // Change Z-axis rotation rate
    }
    if (rect.bottom >= containerRect.bottom || rect.top <= containerRect.top) {
      ySpeed *= -1 * damping;
      ySpeed = adjustSpeed(ySpeed);
      zRotationRate = getRandomRotationRate(); // Change Z-axis rotation rate
    }

    // Move and rotate card
    card.style.left = (card.offsetLeft + xSpeed) + 'px';
    card.style.top = (card.offsetTop + ySpeed) + 'px';
    card.style.transform = `rotate3d(1, 1, 1, ${zRotation}deg)`;
  }
  
  document.addEventListener('keydown', (e) => {
  const step = 10; // Distance the card moves with each arrow key press
  const rotationStep = 180; // Degrees the card rotates with each Page Up/Down press

  switch (e.key) {
    case 'ArrowUp':
      card.style.top = Math.max(card.offsetTop - step, 0) + 'px';
      break;
    case 'ArrowDown':
      card.style.top = Math.min(card.offsetTop + step, window.innerHeight - card.offsetHeight) + 'px';
      break;
    case 'ArrowLeft':
      card.style.left = Math.max(card.offsetLeft - step, 0) + 'px';
      break;
    case 'ArrowRight':
      card.style.left = Math.min(card.offsetLeft + step, window.innerWidth - card.offsetWidth) + 'px';
      break;
    case 'PageUp':
      zRotation += rotationStep;
      card.style.transform = `rotate3d(1, 1, 1, ${zRotation}deg)`;
      break;
    case 'PageDown':
      zRotation -= rotationStep;
      card.style.transform = `rotate3d(1, 1, 1, ${zRotation}deg)`;
      break;
    case 'Home':
      initCard(); // Reset the card's position and initial movement
      break;
  }
});


  requestAnimationFrame(moveCard);
}

function getRandomRotationRate() {
  // Generate a random rotation rate between -1 and 1 degrees per frame
  return Math.random() * 2 - 1;
}

function adjustSpeed(speed) {
  return Math.sign(speed) * Math.max(Math.abs(speed), minSpeed);
}

// Initialize and start moving the card
initCard();
moveCard();
