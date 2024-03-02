let spinning = true;
let angleX = 0;
let angleY = 0;
let angleZ = 0;

const cardInner = document.querySelector('.card-inner');

function spinCard() {
  if (spinning) {
    angleX += 1;
    angleY += 1;
    angleZ += 1;
    cardInner.style.transition = 'none';
    cardInner.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg) rotateZ(${angleZ}deg)`;
    requestAnimationFrame(spinCard);
  }
}

function toggleSpin() {
  spinning = !spinning;
  if (spinning) {
    spinCard(); // Resume spinning
  } else {
    cardInner.style.transition = 'transform 0.6s'; // Smooth transition when stopping
  }
}

spinCard(); // Start spinning on load
